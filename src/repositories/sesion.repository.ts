import { prisma } from "@/lib/prisma";
import type { SesionRepo } from "@/services/auth.service";

export const sesionRepository: SesionRepo = {
  crear: async (usuarioId, tokenHash, expiraEn) => {
    await prisma.sesion.create({ data: { usuarioId, tokenHash, expiraEn } });
  },
  buscarPorTokenHash: (tokenHash) =>
    prisma.sesion.findUnique({ where: { tokenHash }, select: { usuarioId: true, expiraEn: true } }),
  eliminarPorTokenHash: async (tokenHash) => {
    await prisma.sesion.deleteMany({ where: { tokenHash } });
  },
  eliminarDeUsuario: async (usuarioId) => {
    await prisma.sesion.deleteMany({ where: { usuarioId } });
  },
};