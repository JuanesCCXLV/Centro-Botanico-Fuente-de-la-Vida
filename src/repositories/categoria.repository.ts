import { prisma } from "@/lib/prisma";
import type { CategoriaRepo } from "@/services/producto.service";

export const categoriaRepository: CategoriaRepo = {
  listar: () =>
    prisma.categoria.findMany({ orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true } }),
  existe: async (id) => Number.isSafeInteger(id) && (await prisma.categoria.count({ where: { id } })) > 0,
};
