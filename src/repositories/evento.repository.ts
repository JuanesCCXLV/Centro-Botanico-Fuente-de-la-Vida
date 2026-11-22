import { prisma } from "@/lib/prisma";
import type { EventoRepo } from "@/services/auth.service";

export const eventoRepository: EventoRepo = {
  registrar: async ({ tipo, usuarioId, ip }) => {
    await prisma.evento.create({ data: { tipo, usuarioId: usuarioId ?? null, ip: ip ?? null } });
  },
  contarPorIpDesde: (tipo, ip, desde) =>
    prisma.evento.count({ where: { tipo, ip, creadoEn: { gte: desde } } }),
};
