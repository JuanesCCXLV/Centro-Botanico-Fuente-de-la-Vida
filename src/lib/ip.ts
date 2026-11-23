import { headers } from "next/headers";
import { plataforma, type Plataforma } from "./url-sitio";

type Cabeceras = Pick<Headers, "get">;

/**
 * Elige la IP del cliente según la cabecera que la plataforma fija y el visitante no puede falsificar:
 * - Netlify: `x-nf-client-connection-ip`. Netlify no garantiza `x-real-ip`; si se leyera, un atacante
 *   podría inventarla en cada intento y saltarse el límite de inicios de sesión por IP (CS-14).
 * - Vercel: `x-real-ip` y `x-forwarded-for`, que la plataforma sobrescribe.
 * - Local: pueden venir vacías o falsificadas, lo cual es aceptable para desarrollo.
 */
export function ipDesdeCabeceras(h: Cabeceras, donde: Plataforma): string | null {
  const ip =
    donde === "netlify"
      ? h.get("x-nf-client-connection-ip")
      : (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]);
  return ip?.trim().slice(0, 64) || null;
}

/** IP del cliente para auditoría y límite de peticiones. */
export async function obtenerIp(): Promise<string | null> {
  // process.env.PLATAFORMA se fija al compilar (next.config.ts)
  return ipDesdeCabeceras(await headers(), plataforma({ PLATAFORMA: process.env.PLATAFORMA, VERCEL: process.env.VERCEL }));
}
