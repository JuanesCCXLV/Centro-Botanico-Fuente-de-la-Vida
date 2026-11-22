import { headers } from "next/headers";

/**
 * IP del cliente para auditoría y límite de peticiones.
 * En Vercel, `x-real-ip` y `x-forwarded-for` los fija la plataforma; en local pueden
 * venir vacíos o ser falsificados, lo cual es aceptable para desarrollo.
 */
export async function obtenerIp(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim().slice(0, 64) || null;
}
