"use server";

import { redirect } from "next/navigation";
import { authService } from "@/lib/auth";
import { obtenerIp } from "@/lib/ip";
import { borrarCookieSesion, guardarCookieSesion, leerTokenSesion, requireAdmin } from "@/lib/sesion";
import { RUTA_LOGIN, RUTA_PANEL } from "@/lib/sesion-constantes";
import { esquemaCambioClave, esquemaLogin } from "@/lib/validaciones/auth";

export type EstadoLogin = { error?: string };

// Mensaje único: no revela si el correo existe ni si la cuenta o la IP están bloqueadas (CP-11, CS-08)
const ERROR_GENERICO =
  "Correo o contraseña incorrectos. Tras varios intentos fallidos el acceso se bloquea temporalmente.";

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const datos = esquemaLogin.safeParse({
    correo: formData.get("correo"),
    clave: formData.get("clave"),
  });
  if (!datos.success) return { error: ERROR_GENERICO };

  const resultado = await authService.login(datos.data.correo, datos.data.clave, { ip: await obtenerIp() });
  if (!resultado.ok) return { error: ERROR_GENERICO };

  await guardarCookieSesion(resultado.token, resultado.expiraEn);
  redirect(RUTA_PANEL);
}

export async function cerrarSesion(): Promise<void> {
  await authService.cerrarSesion(await leerTokenSesion(), { ip: await obtenerIp() });
  await borrarCookieSesion();
  redirect(RUTA_LOGIN);
}

export type EstadoCambioClave = { error?: string; exito?: string };

const MENSAJES_CAMBIO = {
  CLAVE_ACTUAL_INCORRECTA: "La contraseña actual no es correcta.",
  CLAVE_INVALIDA: "La nueva contraseña debe tener entre 12 y 256 caracteres.",
  USUARIO_NO_ENCONTRADO: "No se pudo cambiar la contraseña. Vuelve a iniciar sesión.",
} as const;

export async function cambiarContrasena(
  _previo: EstadoCambioClave,
  formData: FormData,
): Promise<EstadoCambioClave> {
  const admin = await requireAdmin();

  const datos = esquemaCambioClave.safeParse({
    actual: formData.get("actual"),
    nueva: formData.get("nueva"),
    confirmacion: formData.get("confirmacion"),
  });
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Datos inválidos." };

  const r = await authService.cambiarContrasena(admin.id, datos.data.actual, datos.data.nueva, {
    ip: await obtenerIp(),
  });
  if (!r.ok) return { error: MENSAJES_CAMBIO[r.error] };

  // Las demás sesiones quedaron cerradas; esta sigue con un token nuevo
  await guardarCookieSesion(r.token, r.expiraEn);
  return { exito: "Contraseña actualizada. Se cerraron las sesiones en otros dispositivos." };
}
