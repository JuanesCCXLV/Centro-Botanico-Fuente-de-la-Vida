import { prisma } from "@/lib/prisma";
import type { CatalogoRepo } from "@/services/catalogo.service";

// Un producto es público si él y su categoría están visibles (CP-01, CP-02)
const visible = { visible: true, categoria: { visible: true } } as const;

const campos = {
  id: true,
  nombre: true,
  slug: true,
  descripcion: true,
  presentacion: true,
  usoSugerido: true,
  precioCop: true,
  registroSanitario: true,
  destacado: true,
  actualizadoEn: true,
  categoria: { select: { nombre: true, slug: true } },
  imagenes: { select: { tipo: true, url: true, textoAlternativo: true }, orderBy: { tipo: "asc" as const } },
} as const;

export const catalogoRepository: CatalogoRepo = {
  listarProductosVisibles: () => prisma.producto.findMany({ where: visible, select: campos }),

  buscarProductoVisible: (slug) => prisma.producto.findFirst({ where: { ...visible, slug }, select: campos }),

  listarCategoriasVisibles: () =>
    prisma.categoria.findMany({
      // Solo categorías con al menos un producto visible
      where: { visible: true, productos: { some: { visible: true } } },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: { nombre: true, slug: true },
    }),
};
