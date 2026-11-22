import type { ImageStorage, ImagenSubida } from "@/lib/almacenamiento/image-storage";
import { slugificar } from "@/lib/slug";
import { validarImagen } from "@/lib/validaciones/imagen";
import type { DatosProducto, ErroresCampos } from "@/lib/validaciones/producto";
import type { Contexto, EventoRepo } from "./eventos";

export type TipoImagen = "FRONTAL" | "POSTERIOR";
export const TIPOS_IMAGEN: TipoImagen[] = ["FRONTAL", "POSTERIOR"];

export type ArchivoImagen = { bytes: Uint8Array; tipoMime: string };
export type ImagenesEntrada = Partial<Record<TipoImagen, ArchivoImagen>>;

export interface ImagenGuardada {
  tipo: TipoImagen;
  url: string;
  idPublico: string;
}

export interface ProductoListado {
  id: number;
  nombre: string;
  slug: string;
  precioCop: number;
  visible: boolean;
  destacado: boolean;
  categoria: string;
  miniatura: string | null;
}

export interface ProductoEdicion extends DatosProducto {
  id: number;
  slug: string;
  imagenes: { tipo: TipoImagen; url: string }[];
}

export interface ProductoRepo {
  listarAdmin(): Promise<ProductoListado[]>;
  buscarParaEditar(id: number): Promise<ProductoEdicion | null>;
  slugExiste(slug: string): Promise<boolean>;
  crear(datos: DatosProducto & { slug: string }): Promise<{ id: number }>;
  actualizar(id: number, datos: DatosProducto): Promise<void>;
  /** null si el producto no existe. */
  buscarImagenes(id: number): Promise<ImagenGuardada[] | null>;
  /** Crea o reemplaza la imagen de ese tipo (única por producto y tipo). */
  guardarImagen(productoId: number, imagen: ImagenGuardada): Promise<void>;
  cambiarVisibilidad(id: number, visible: boolean): Promise<boolean>;
  eliminar(id: number): Promise<boolean>;
}

export interface CategoriaRepo {
  listar(): Promise<{ id: number; nombre: string }[]>;
  existe(id: number): Promise<boolean>;
}

export type ResultadoGuardar = { ok: true; id: number } | { ok: false; errores: ErroresCampos };

const CARPETA = "productos";
const recurso = (id: number) => `producto:${id}`;
const idValido = (id: number) => Number.isSafeInteger(id) && id > 0;

export function crearProductoService(deps: {
  productos: ProductoRepo;
  categorias: CategoriaRepo;
  imagenes: ImageStorage;
  eventos: EventoRepo;
}) {
  const { productos, categorias, imagenes: storage, eventos } = deps;

  async function slugUnico(nombre: string): Promise<string> {
    const base = slugificar(nombre) || "producto";
    let slug = base;
    for (let n = 2; await productos.slugExiste(slug); n++) slug = `${base}-${n}`;
    return slug;
  }

  /** Valida la categoría y las imágenes. Devuelve los formatos detectados o los errores. */
  async function validar(datos: DatosProducto, archivos: ImagenesEntrada, exigirFrontal: boolean) {
    const errores: ErroresCampos = {};
    if (!(await categorias.existe(datos.categoriaId))) errores.categoriaId = "La categoría no existe.";
    if (exigirFrontal && !archivos.FRONTAL) errores.imagenFRONTAL = "La imagen frontal es obligatoria.";

    const formatos: Partial<Record<TipoImagen, "jpg" | "png" | "webp">> = {};
    for (const tipo of TIPOS_IMAGEN) {
      const archivo = archivos[tipo];
      if (!archivo) continue;
      const v = validarImagen(archivo.bytes, archivo.tipoMime);
      if (v.ok) formatos[tipo] = v.formato;
      else errores[`imagen${tipo}`] = v.error;
    }
    return { errores, formatos };
  }

  /** Sube las imágenes nuevas. Si alguna falla, borra las que ya se habían subido. */
  async function subirTodas(archivos: ImagenesEntrada, formatos: Partial<Record<TipoImagen, "jpg" | "png" | "webp">>) {
    const subidas: { tipo: TipoImagen; imagen: ImagenSubida }[] = [];
    try {
      for (const tipo of TIPOS_IMAGEN) {
        const archivo = archivos[tipo];
        const formato = formatos[tipo];
        if (archivo && formato) subidas.push({ tipo, imagen: await storage.subir(archivo.bytes, formato, CARPETA) });
      }
      return subidas;
    } catch (e) {
      await borrarDelAlmacenamiento(subidas.map((s) => s.imagen.idPublico));
      throw e;
    }
  }

  async function borrarDelAlmacenamiento(ids: string[]) {
    // Mejor esfuerzo: un archivo huérfano no debe impedir la operación principal
    await Promise.all(ids.map((id) => storage.eliminar(id).catch(() => undefined)));
  }

  async function crear(datos: DatosProducto, archivos: ImagenesEntrada, ctx: Contexto = {}): Promise<ResultadoGuardar> {
    const { errores, formatos } = await validar(datos, archivos, true);
    if (Object.keys(errores).length) return { ok: false, errores };

    const subidas = await subirTodas(archivos, formatos);
    let id: number | undefined;
    try {
      ({ id } = await productos.crear({ ...datos, slug: await slugUnico(datos.nombre) }));
      for (const { tipo, imagen } of subidas) await productos.guardarImagen(id, { tipo, ...imagen });
    } catch (e) {
      if (id !== undefined) await productos.eliminar(id).catch(() => undefined);
      await borrarDelAlmacenamiento(subidas.map((s) => s.imagen.idPublico));
      throw e;
    }

    const idCreado = id as number;
    await eventos.registrar({ tipo: "PRODUCTO_CREADO", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(idCreado) });
    return { ok: true, id: idCreado };
  }

  async function actualizar(
    id: number,
    datos: DatosProducto,
    archivos: ImagenesEntrada,
    ctx: Contexto = {},
  ): Promise<ResultadoGuardar> {
    const actuales = idValido(id) ? await productos.buscarImagenes(id) : null;
    if (!actuales) return { ok: false, errores: { general: "El producto no existe." } };

    const { errores, formatos } = await validar(datos, archivos, false);
    if (Object.keys(errores).length) return { ok: false, errores };

    // El slug no cambia al editar: así no se rompen los enlaces ni el posicionamiento en Google
    const subidas = await subirTodas(archivos, formatos);
    try {
      await productos.actualizar(id, datos);
      for (const { tipo, imagen } of subidas) await productos.guardarImagen(id, { tipo, ...imagen });
    } catch (e) {
      await borrarDelAlmacenamiento(subidas.map((s) => s.imagen.idPublico));
      throw e;
    }

    // CP-19: la imagen anterior se borra del almacenamiento solo después de guardar la nueva
    const reemplazadas = actuales.filter((a) => subidas.some((s) => s.tipo === a.tipo)).map((a) => a.idPublico);
    await borrarDelAlmacenamiento(reemplazadas);

    await eventos.registrar({ tipo: "PRODUCTO_EDITADO", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(id) });
    return { ok: true, id };
  }

  async function cambiarVisibilidad(id: number, visible: boolean, ctx: Contexto = {}): Promise<boolean> {
    if (!idValido(id) || !(await productos.cambiarVisibilidad(id, visible))) return false;
    await eventos.registrar({ tipo: "PRODUCTO_VISIBILIDAD", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(id) });
    return true;
  }

  /** CP-17: elimina el producto y sus imágenes del almacenamiento. */
  async function eliminar(id: number, ctx: Contexto = {}): Promise<boolean> {
    const actuales = idValido(id) ? await productos.buscarImagenes(id) : null;
    if (!actuales || !(await productos.eliminar(id))) return false;
    await borrarDelAlmacenamiento(actuales.map((a) => a.idPublico));
    await eventos.registrar({ tipo: "PRODUCTO_ELIMINADO", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(id) });
    return true;
  }

  return {
    listar: () => productos.listarAdmin(),
    obtenerParaEditar: (id: number) => (idValido(id) ? productos.buscarParaEditar(id) : Promise.resolve(null)),
    listarCategorias: () => categorias.listar(),
    crear,
    actualizar,
    cambiarVisibilidad,
    eliminar,
  };
}
