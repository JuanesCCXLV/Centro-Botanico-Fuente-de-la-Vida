"use server";

import { redirect } from "next/navigation";
import { authService } from "@/lib/auth";
import { borrarCookieSesion, guardarCookieSesion, leerTokenSesion } from "@/lib/sesion";
import { RUTA_LOGIN, RUTA_PANEL } from "@/lib/sesion-constantes";
import { esquemaLogin } from "@/lib/validaciones/auth";

export type EstadoLogin = { error?: string };

// Mensaje único: no revela si el correo existe ni si la cuenta está bloqueada (CP-11, CS-08)
const ERROR_GENERICO =
  "Correo o contraseña incorrectos. Tras varios intentos fallidos la cuenta se bloquea temporalmente.";

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const datos = esquemaLogin.safeParse({
    correo: formData.get("correo"),
    clave: formData.get("clave"),
  });
  if (!datos.success) return { error: ERROR_GENERICO };

  const resultado = await authService.login(datos.data.correo, datos.data.clave);
  if (!resultado.ok) return { error: ERROR_GENERICO };

  await guardarCookieSesion(resultado.token, resultado.expiraEn);
  redirect(RUTA_PANEL);
}

export async function cerrarSesion(): Promise<void> {
  await authService.cerrarSesion(await leerTokenSesion());
  await borrarCookieSesion();
  redirect(RUTA_LOGIN);
}
