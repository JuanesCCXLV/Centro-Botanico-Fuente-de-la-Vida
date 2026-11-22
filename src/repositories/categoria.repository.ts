import { prisma } from "@/lib/prisma";
import type { CategoriaAdminRepo } from "@/services/categoria.service";
import type { CategoriaRepo } from "@/services/producto.service";

const codigo = (e: unknown) => (e as { code?: string })?.code;
const camposEditables = { nombre: true, descripcion: true, orden: true, visible: true } as const;
const orden = [{ orden: "asc" as const }, { nombre: "asc" as const }];

/** Lo que necesita el servicio de productos (lista para el selector y validación). */
export const categoriaRepository: CategoriaRepo = {
  listar: () => prisma.categoria.findMany({ orderBy: orden, select: { id: true, nombre: true } }),
  existe: async (id) => Number.isSafeInteger(id) && (await prisma.categoria.count({ where: { id } })) > 0,
};

export const categoriaAdminRepository: CategoriaAdminRepo = {
  listarConConteo: async () => {
    const filas = await prisma.categoria.findMany({
      orderBy: orden,
      select: { ...camposEditables, id: true, slug: true, _count: { select: { productos: true } } },
    });
    return filas.map(({ _count, ...c }) => ({ ...c, cantidadProductos: _count.productos }));
  },

  buscarPorId: (id) =>
    prisma.categoria.findUnique({ where: { id }, select: { ...camposEditables, id: true, slug: true } }),

  slugExiste: async (slug) => (await prisma.categoria.count({ where: { slug } })) > 0,

  crear: (datos) => prisma.categoria.create({ data: datos, select: { id: true } }),

  actualizar: async (id, datos) => {
    try {
      await prisma.categoria.update({ where: { id }, data: datos });
      return true;
    } catch (e) {
      if (codigo(e) === "P2025") return false;
      throw e;
    }
  },

  cambiarVisibilidad: async (id, visible) => {
    try {
      await prisma.categoria.update({ where: { id }, data: { visible } });
      return true;
    } catch (e) {
      if (codigo(e) === "P2025") return false;
      throw e;
    }
  },

  contarProductos: (id) => prisma.producto.count({ where: { categoriaId: id } }),

  eliminar: async (id) => {
    try {
      await prisma.categoria.delete({ where: { id } });
      return "OK";
    } catch (e) {
      if (codigo(e) === "P2025") return "NO_EXISTE";
      // P2003: violación de clave foránea (Producto.categoria tiene onDelete: Restrict)
      if (codigo(e) === "P2003") return "TIENE_PRODUCTOS";
      throw e;
    }
  },
};
