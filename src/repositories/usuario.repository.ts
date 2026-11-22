import { prisma } from "@/lib/prisma";
import type { UsuarioRepo } from "@/services/auth.service";

const campos = {
  id: true, nombre: true, correo: true, hashContrasena: true,
  activo: true, intentosFallidos: true, bloqueadoHasta: true,
} as const;

export const usuarioRepository: UsuarioRepo = {
  buscarPorCorreo: (correo) => prisma.usuario.findUnique({ where: { correo }, select: campos }),
  buscarPorId: (id) => prisma.usuario.findUnique({ where: { id }, select: campos }),
  registrarFallo: async (id, maxIntentos, bloquearHasta) => {
    const { intentosFallidos } = await prisma.usuario.update({
      where: { id },
      data: { intentosFallidos: { increment: 1 } },
      select: { intentosFallidos: true },
    });
    if (intentosFallidos >= maxIntentos) {
      await prisma.usuario.update({ where: { id }, data: { intentosFallidos: 0, bloqueadoHasta: bloquearHasta } });
    }
  },
  registrarExito: async (id, ahora) => {
    await prisma.usuario.update({
      where: { id },
      data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoLoginEn: ahora },
    });
  },
  actualizarHash: async (id, hashContrasena) => {
    await prisma.usuario.update({ where: { id }, data: { hashContrasena } });
  },
};
