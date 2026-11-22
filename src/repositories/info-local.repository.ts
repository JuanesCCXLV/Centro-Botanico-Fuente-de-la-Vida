import { prisma } from "@/lib/prisma";
import type { RedesSociales } from "@/lib/validaciones/info-local";
import type { InfoLocalRepo } from "@/services/info-local.service";

const ID_UNICO = 1;

/** El JSON guardado se filtra para devolver solo textos conocidos. */
function leerRedes(valor: unknown): RedesSociales {
  if (!valor || typeof valor !== "object") return {};
  const redes: RedesSociales = {};
  for (const red of ["instagram", "facebook", "tiktok"] as const) {
    const v = (valor as Record<string, unknown>)[red];
    if (typeof v === "string") redes[red] = v;
  }
  return redes;
}

export const infoLocalRepository: InfoLocalRepo = {
  obtener: async () => {
    const fila = await prisma.infoLocal.findUnique({
      where: { id: ID_UNICO },
      select: {
        direccion: true,
        telefonos: true,
        whatsapp: true,
        correo: true,
        horarios: true,
        latitud: true,
        longitud: true,
        redesSociales: true,
      },
    });
    if (!fila) return null;
    return { ...fila, redesSociales: leerRedes(fila.redesSociales) };
  },

  guardar: async (datos) => {
    await prisma.infoLocal.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO, ...datos },
      update: datos,
    });
  },
};
