import { prisma } from "@/lib/prisma";
import type { ProductoRepo } from "@/services/producto.service";

const camposEditables = {
  nombre: true,
  descripcion: true,
  presentacion: true,
  usoSugerido: true,
  precioCop: true,
  categoriaId: true,
  registroSanitario: true,
  visible: true,
  destacado: true,
} as const;

/** P2025: el registro no existe. Se traduce a `false` en lugar de una excepción. */
const noExiste = (e: unknown) => (e as { code?: string })?.code === "P2025";

export const productoRepository: ProductoRepo = {
  listarAdmin: async () => {
    const filas = await prisma.producto.findMany({
      orderBy: [{ actualizadoEn: "desc" }],
      select: {
        id: true,
        nombre: true,
        slug: true,
        precioCop: true,
        visible: true,
        destacado: true,
        categoria: { select: { nombre: true } },
        imagenes: { where: { tipo: "FRONTAL" }, select: { url: true }, take: 1 },
      },
    });
    return filas.map(({ categoria, imagenes, ...p }) => ({
      ...p,
      categoria: categoria.nombre,
      miniatura: imagenes[0]?.url ?? null,
    }));
  },

  buscarParaEditar: async (id) => {
    const p = await prisma.producto.findUnique({
      where: { id },
      select: { ...camposEditables, id: true, slug: true, imagenes: { select: { tipo: true, url: true } } },
    });
    return p;
  },

  slugExiste: async (slug) => (await prisma.producto.count({ where: { slug } })) > 0,

  crear: (datos) => prisma.producto.create({ data: datos, select: { id: true } }),

  actualizar: async (id, datos) => {
    await prisma.producto.update({ where: { id }, data: datos });
  },

  buscarImagenes: async (id) => {
    const p = await prisma.producto.findUnique({
      where: { id },
      select: { imagenes: { select: { tipo: true, url: true, idPublico: true } } },
    });
    return p?.imagenes ?? null;
  },

  guardarImagen: async (productoId, { tipo, url, idPublico }) => {
    await prisma.imagenProducto.upsert({
      where: { productoId_tipo: { productoId, tipo } },
      create: { productoId, tipo, url, idPublico },
      update: { url, idPublico },
    });
  },

  cambiarVisibilidad: async (id, visible) => {
    try {
      await prisma.producto.update({ where: { id }, data: { visible } });
      return true;
    } catch (e) {
      if (noExiste(e)) return false;
      throw e;
    }
  },

  eliminar: async (id) => {
    try {
      // Las filas de ImagenProducto se borran en cascada (onDelete: Cascade)
      await prisma.producto.delete({ where: { id } });
      return true;
    } catch (e) {
      if (noExiste(e)) return false;
      throw e;
    }
  },
};
