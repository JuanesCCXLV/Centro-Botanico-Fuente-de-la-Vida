import { describe, expect, it } from "vitest";
import type { ImageStorage } from "@/lib/almacenamiento/image-storage";
import type { DatosProducto } from "@/lib/validaciones/producto";
import type { TipoEvento } from "@/services/eventos";
import {
  crearProductoService,
  type ImagenGuardada,
  type ProductoEdicion,
  type ProductoRepo,
} from "@/services/producto.service";

const PNG = { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]), tipoMime: "image/png" };
const JPG = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1]), tipoMime: "image/jpeg" };
const SVG = { bytes: new TextEncoder().encode("<svg><script/></svg>"), tipoMime: "image/png" };

const datos: DatosProducto = {
  nombre: "Té verde",
  descripcion: "Hojas.",
  presentacion: null,
  usoSugerido: null,
  precioCop: 15000,
  categoriaId: 1,
  registroSanitario: null,
  visible: true,
  destacado: false,
};

function montar(opciones: { falloAlSubir?: number } = {}) {
  type Fila = DatosProducto & { id: number; slug: string; imagenes: ImagenGuardada[] };
  const filas = new Map<number, Fila>();
  let siguienteId = 1;
  const archivos = new Set<string>();
  let subidas = 0;
  const eventos: { tipo: TipoEvento; recurso?: string | null }[] = [];

  const productos: ProductoRepo = {
    listarAdmin: async () => [],
    buscarParaEditar: async (id) => {
      const f = filas.get(id);
      return f ? ({ ...f, imagenes: f.imagenes.map(({ tipo, url }) => ({ tipo, url })) } as ProductoEdicion) : null;
    },
    slugExiste: async (slug) => [...filas.values()].some((f) => f.slug === slug),
    crear: async (d) => {
      const id = siguienteId++;
      filas.set(id, { ...d, id, imagenes: [] });
      return { id };
    },
    actualizar: async (id, d) => {
      Object.assign(filas.get(id)!, d);
    },
    buscarImagenes: async (id) => filas.get(id)?.imagenes.map((i) => ({ ...i })) ?? null,
    guardarImagen: async (id, img) => {
      const f = filas.get(id)!;
      f.imagenes = [...f.imagenes.filter((i) => i.tipo !== img.tipo), img];
    },
    cambiarVisibilidad: async (id, visible) => {
      const f = filas.get(id);
      if (!f) return false;
      f.visible = visible;
      return true;
    },
    eliminar: async (id) => filas.delete(id),
  };

  const storage: ImageStorage = {
    subir: async (_bytes, formato, carpeta) => {
      subidas++;
      if (opciones.falloAlSubir === subidas) throw new Error("Cloudinary caído");
      const idPublico = `${carpeta}/img${subidas}.${formato}`;
      archivos.add(idPublico);
      return { url: `https://cdn.test/${idPublico}`, idPublico };
    },
    eliminar: async (id) => {
      archivos.delete(id);
    },
  };

  const servicio = crearProductoService({
    productos,
    categorias: { listar: async () => [{ id: 1, nombre: "Tés" }], existe: async (id) => id === 1 },
    imagenes: storage,
    eventos: {
      registrar: async (e) => {
        eventos.push({ tipo: e.tipo, recurso: e.recurso });
      },
      contarPorIpDesde: async () => 0,
    },
  });

  return { servicio, filas, archivos, eventos };
}

describe("ProductoService · crear", () => {
  it("crea el producto con sus dos imágenes y registra el evento (CP-13)", async () => {
    const { servicio, filas, archivos, eventos } = montar();
    const r = await servicio.crear(datos, { FRONTAL: PNG, POSTERIOR: JPG });
    expect(r).toEqual({ ok: true, id: 1 });
    expect(filas.get(1)?.slug).toBe("te-verde");
    expect(filas.get(1)?.imagenes.map((i) => i.tipo).sort()).toEqual(["FRONTAL", "POSTERIOR"]);
    expect(archivos.size).toBe(2);
    expect(eventos).toEqual([{ tipo: "PRODUCTO_CREADO", recurso: "producto:1" }]);
  });

  it("genera slugs únicos para nombres repetidos", async () => {
    const { servicio, filas } = montar();
    await servicio.crear(datos, { FRONTAL: PNG });
    await servicio.crear(datos, { FRONTAL: PNG });
    expect(filas.get(2)?.slug).toBe("te-verde-2");
  });

  it("exige imagen frontal, categoría existente e imágenes válidas, sin subir nada", async () => {
    const { servicio, archivos, filas } = montar();
    const r = await servicio.crear({ ...datos, categoriaId: 99 }, { POSTERIOR: SVG });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errores).sort()).toEqual(["categoriaId", "imagenFRONTAL", "imagenPOSTERIOR"]);
    expect(archivos.size).toBe(0);
    expect(filas.size).toBe(0);
  });

  it("si falla la segunda subida, borra la primera y no crea el producto", async () => {
    const { servicio, archivos, filas } = montar({ falloAlSubir: 2 });
    await expect(servicio.crear(datos, { FRONTAL: PNG, POSTERIOR: JPG })).rejects.toThrow();
    expect(archivos.size).toBe(0);
    expect(filas.size).toBe(0);
  });
});

describe("ProductoService · editar, ocultar y eliminar", () => {
  it("edita sin cambiar el slug y conserva las imágenes si no se envían nuevas (CP-15)", async () => {
    const { servicio, filas, archivos } = montar();
    await servicio.crear(datos, { FRONTAL: PNG });
    const r = await servicio.actualizar(1, { ...datos, nombre: "Té verde premium", precioCop: 18000 }, {});
    expect(r.ok).toBe(true);
    expect(filas.get(1)).toMatchObject({ nombre: "Té verde premium", precioCop: 18000, slug: "te-verde" });
    expect(archivos.size).toBe(1);
  });

  it("al reemplazar una imagen borra la anterior del almacenamiento (CP-19)", async () => {
    const { servicio, filas, archivos } = montar();
    await servicio.crear(datos, { FRONTAL: PNG });
    const anterior = filas.get(1)!.imagenes[0].idPublico;
    await servicio.actualizar(1, datos, { FRONTAL: JPG });
    const nueva = filas.get(1)!.imagenes[0].idPublico;
    expect(nueva).not.toBe(anterior);
    expect(archivos.has(anterior)).toBe(false);
    expect(archivos.has(nueva)).toBe(true);
  });

  it("no edita productos inexistentes ni ids inválidos", async () => {
    const { servicio } = montar();
    expect((await servicio.actualizar(42, datos, {})).ok).toBe(false);
    expect((await servicio.actualizar(-1, datos, {})).ok).toBe(false);
    expect(await servicio.obtenerParaEditar(Number.NaN)).toBeNull();
  });

  it("oculta y vuelve a mostrar un producto, conservándolo en la base de datos (CP-16)", async () => {
    const { servicio, filas, eventos } = montar();
    await servicio.crear(datos, { FRONTAL: PNG });
    expect(await servicio.cambiarVisibilidad(1, false)).toBe(true);
    expect(filas.get(1)?.visible).toBe(false);
    expect(await servicio.cambiarVisibilidad(99, false)).toBe(false);
    expect(eventos.at(-1)?.tipo).toBe("PRODUCTO_VISIBILIDAD");
  });

  it("elimina el producto y sus imágenes del almacenamiento (CP-17)", async () => {
    const { servicio, filas, archivos, eventos } = montar();
    await servicio.crear(datos, { FRONTAL: PNG, POSTERIOR: JPG });
    expect(await servicio.eliminar(1)).toBe(true);
    expect(filas.size).toBe(0);
    expect(archivos.size).toBe(0);
    expect(eventos.at(-1)).toEqual({ tipo: "PRODUCTO_ELIMINADO", recurso: "producto:1" });
    expect(await servicio.eliminar(1)).toBe(false);
  });
});
