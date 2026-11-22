import { describe, expect, it } from "vitest";
import type { DatosCategoria } from "@/lib/validaciones/categoria";
import { crearCategoriaService, type CategoriaAdminRepo } from "@/services/categoria.service";
import type { TipoEvento } from "@/services/eventos";

const datos: DatosCategoria = { nombre: "Infusiones y tés", descripcion: null, orden: 1, visible: true };

function montar() {
  const filas = new Map<number, DatosCategoria & { id: number; slug: string }>();
  const productosPorCategoria = new Map<number, number>();
  let siguiente = 1;
  const eventos: TipoEvento[] = [];

  const repo: CategoriaAdminRepo = {
    listarConConteo: async () => [...filas.values()].map((c) => ({ ...c, cantidadProductos: productosPorCategoria.get(c.id) ?? 0 })),
    buscarPorId: async (id) => filas.get(id) ?? null,
    slugExiste: async (slug) => [...filas.values()].some((c) => c.slug === slug),
    crear: async (d) => {
      const id = siguiente++;
      filas.set(id, { ...d, id });
      return { id };
    },
    actualizar: async (id, d) => (filas.has(id) ? (Object.assign(filas.get(id)!, d), true) : false),
    cambiarVisibilidad: async (id, visible) => (filas.has(id) ? ((filas.get(id)!.visible = visible), true) : false),
    contarProductos: async (id) => productosPorCategoria.get(id) ?? 0,
    eliminar: async (id) => {
      if (!filas.has(id)) return "NO_EXISTE";
      if ((productosPorCategoria.get(id) ?? 0) > 0) return "TIENE_PRODUCTOS";
      filas.delete(id);
      return "OK";
    },
  };

  const servicio = crearCategoriaService({
    categorias: repo,
    eventos: { registrar: async (e) => void eventos.push(e.tipo), contarPorIpDesde: async () => 0 },
  });
  return { servicio, filas, productosPorCategoria, eventos };
}

describe("CategoriaService (HU-08)", () => {
  it("crea con slug único y lo conserva al editar", async () => {
    const { servicio, filas } = montar();
    await servicio.crear(datos);
    await servicio.crear(datos);
    expect(filas.get(1)?.slug).toBe("infusiones-y-tes");
    expect(filas.get(2)?.slug).toBe("infusiones-y-tes-2");

    await servicio.actualizar(1, { ...datos, nombre: "Tés e infusiones" });
    expect(filas.get(1)).toMatchObject({ nombre: "Tés e infusiones", slug: "infusiones-y-tes" });
  });

  it("no edita ni cambia la visibilidad de categorías inexistentes", async () => {
    const { servicio } = montar();
    expect((await servicio.actualizar(9, datos)).ok).toBe(false);
    expect(await servicio.cambiarVisibilidad(9, false)).toBe(false);
    expect(await servicio.obtener(Number.NaN)).toBeNull();
  });

  it("impide eliminar una categoría con productos e informa cuántos tiene (CP-18)", async () => {
    const { servicio, filas, productosPorCategoria, eventos } = montar();
    await servicio.crear(datos);
    productosPorCategoria.set(1, 3);
    expect(await servicio.eliminar(1)).toEqual({ ok: false, error: "TIENE_PRODUCTOS", cantidad: 3 });
    expect(filas.has(1)).toBe(true);
    expect(eventos).not.toContain("CATEGORIA_ELIMINADA");
  });

  it("elimina una categoría vacía y registra el evento", async () => {
    const { servicio, filas, eventos } = montar();
    await servicio.crear(datos);
    expect(await servicio.eliminar(1)).toEqual({ ok: true });
    expect(filas.size).toBe(0);
    expect(eventos).toEqual(["CATEGORIA_CREADA", "CATEGORIA_ELIMINADA"]);
    expect(await servicio.eliminar(1)).toEqual({ ok: false, error: "NO_EXISTE" });
  });
});
