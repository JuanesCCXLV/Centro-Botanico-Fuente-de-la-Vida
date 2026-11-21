import { prisma } from "@/lib/prisma";
import type { UsuarioRepo } from "@/services/auth.service";

const campos = {
  id: true, nombre: true, correo: true, hashContrasena: true,
  activo: true, intentosFallidos: true, bloqueadoHasta: true,
} as const;

export const usuarioRepository: UsuarioRepo = {
  buscarPorCorreo: (correo) => prisma.usuario.findUnique({ where: { correo }, select: campos }),
  buscarPorId: (id) => prisma.usuario.findUnique({ where: { id }, select: campos }),
  registrarFallo: async (id, intentosFallidos, bloqueadoHasta) => {
    await prisma.usuario.update({ where: { id }, data: { intentosFallidos, bloqueadoHasta } });
  },
  registrarExito: async (id, ahora) => {
    await prisma.usuario.update({
      where: { id },
      data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoLoginEn: ahora },
    });
  },
};