import { slugificar } from "@/lib/slug";
import type { ErroresCampos } from "@/lib/validaciones/comunes";
import type { DatosCategoria } from "@/lib/validaciones/categoria";
import type { Contexto, EventoRepo } from "./eventos";

export interface CategoriaListada extends DatosCategoria {
  id: number;
  slug: string;
  cantidadProductos: number;
}

export interface CategoriaAdminRepo {
  listarConConteo(): Promise<CategoriaListada[]>;
  buscarPorId(id: number): Promise<(DatosCategoria & { id: number; slug: string }) | null>;
  slugExiste(slug: string): Promise<boolean>;
  crear(datos: DatosCategoria & { slug: string }): Promise<{ id: number }>;
  /** false si no existe. */
  actualizar(id: number, datos: DatosCategoria): Promise<boolean>;
  cambiarVisibilidad(id: number, visible: boolean): Promise<boolean>;
  contarProductos(id: number): Promise<number>;
  /** "NO_EXISTE" | "TIENE_PRODUCTOS" (la base de datos lo impide con onDelete: Restrict) | "OK" */
  eliminar(id: number): Promise<"OK" | "NO_EXISTE" | "TIENE_PRODUCTOS">;
}

export type ResultadoCategoria = { ok: true; id: number } | { ok: false; errores: ErroresCampos };
export type ResultadoEliminarCategoria =
  | { ok: true }
  | { ok: false; error: "NO_EXISTE" }
  | { ok: false; error: "TIENE_PRODUCTOS"; cantidad: number };

const recurso = (id: number) => `categoria:${id}`;
const idValido = (id: number) => Number.isSafeInteger(id) && id > 0;

export function crearCategoriaService(deps: { categorias: CategoriaAdminRepo; eventos: EventoRepo }) {
  const { categorias, eventos } = deps;

  async function slugUnico(nombre: string) {
    const base = slugificar(nombre) || "categoria";
    let slug = base;
    for (let n = 2; await categorias.slugExiste(slug); n++) slug = `${base}-${n}`;
    return slug;
  }

  async function crear(datos: DatosCategoria, ctx: Contexto = {}): Promise<ResultadoCategoria> {
    const { id } = await categorias.crear({ ...datos, slug: await slugUnico(datos.nombre) });
    await eventos.registrar({ tipo: "CATEGORIA_CREADA", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(id) });
    return { ok: true, id };
  }

  /** El slug no cambia al editar, para no romper los enlaces del catálogo. */
  async function actualizar(id: number, datos: DatosCategoria, ctx: Contexto = {}): Promise<ResultadoCategoria> {
    if (!idValido(id) || !(await categorias.actualizar(id, datos))) {
      return { ok: false, errores: { general: "La categoría no existe." } };
    }
    await eventos.registrar({ tipo: "CATEGORIA_EDITADA", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(id) });
    return { ok: true, id };
  }

  async function cambiarVisibilidad(id: number, visible: boolean, ctx: Contexto = {}) {
    if (!idValido(id) || !(await categorias.cambiarVisibilidad(id, visible))) return false;
    await eventos.registrar({ tipo: "CATEGORIA_VISIBILIDAD", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(id) });
    return true;
  }

  /** CP-18: una categoría con productos no se puede eliminar; primero hay que moverlos. */
  async function eliminar(id: number, ctx: Contexto = {}): Promise<ResultadoEliminarCategoria> {
    if (!idValido(id)) return { ok: false, error: "NO_EXISTE" };

    const cantidad = await categorias.contarProductos(id);
    if (cantidad > 0) return { ok: false, error: "TIENE_PRODUCTOS", cantidad };

    // La base de datos vuelve a comprobarlo, por si se creó un producto entre el conteo y el borrado
    const r = await categorias.eliminar(id);
    if (r === "TIENE_PRODUCTOS") return { ok: false, error: "TIENE_PRODUCTOS", cantidad: await categorias.contarProductos(id) };
    if (r === "NO_EXISTE") return { ok: false, error: "NO_EXISTE" };

    await eventos.registrar({ tipo: "CATEGORIA_ELIMINADA", usuarioId: ctx.usuarioId, ip: ctx.ip, recurso: recurso(id) });
    return { ok: true };
  }

  return {
    listar: () => categorias.listarConConteo(),
    obtener: (id: number) => (idValido(id) ? categorias.buscarPorId(id) : Promise.resolve(null)),
    crear,
    actualizar,
    cambiarVisibilidad,
    eliminar,
  };
}
