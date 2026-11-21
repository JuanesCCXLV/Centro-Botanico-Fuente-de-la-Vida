// Capa de acceso a la sesión (DAL). Toda verificación de "quién es el usuario"
// pasa por aquí; las páginas y las Server Actions del panel llaman a requireAdmin().
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authService } from "@/lib/auth";
import { env } from "@/lib/env";
import { COOKIE_SESION, RUTA_LOGIN } from "@/lib/sesion-constantes";
import type { UsuarioPublico } from "@/services/auth.service";

export async function guardarCookieSesion(token: string, expiraEn: Date): Promise<void> {
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEn,
  });
}

export async function leerTokenSesion(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_SESION)?.value;
}

export async function borrarCookieSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
}

// cache() evita validar la sesión varias veces en la misma petición (layout + página)
export const obtenerAdmin = cache(async (): Promise<UsuarioPublico | null> => {
  return authService.validarSesion(await leerTokenSesion());
});

export async function requireAdmin(): Promise<UsuarioPublico> {
  const admin = await obtenerAdmin();
  if (!admin) redirect(RUTA_LOGIN);
  return admin;
}
