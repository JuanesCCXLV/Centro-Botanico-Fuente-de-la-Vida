import { prisma } from "@/lib/prisma";
import type { EventoRepo } from "@/services/eventos";

export const eventoRepository: EventoRepo = {
  registrar: async ({ tipo, usuarioId, ip, recurso }) => {
    await prisma.evento.create({
      data: { tipo, usuarioId: usuarioId ?? null, ip: ip ?? null, recurso: recurso ?? null },
    });
  },
  contarPorIpDesde: (tipo, ip, desde) =>
    prisma.evento.count({ where: { tipo, ip, creadoEn: { gte: desde } } }),
};
