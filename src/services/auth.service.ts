import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

export const MAX_INTENTOS = 5;
export const BLOQUEO_MS = 15 * 60 * 1000;
export const SESION_MS = 7 * 24 * 60 * 60 * 1000;
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export interface UsuarioAuth {
  id: string;
  nombre: string;
  correo: string;
  hashContrasena: string;
  activo: boolean;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
}

export interface UsuarioRepo {
  buscarPorCorreo(correo: string): Promise<UsuarioAuth | null>;
  buscarPorId(id: string): Promise<UsuarioAuth | null>;
  /**
   * Suma un intento fallido de forma atómica. Si el total llega a maxIntentos,
   * reinicia el contador y bloquea la cuenta hasta `bloquearHasta`.
   */
  registrarFallo(id: string, maxIntentos: number, bloquearHasta: Date): Promise<void>;
  registrarExito(id: string, ahora: Date): Promise<void>;
}

export interface SesionRepo {
  crear(usuarioId: string, tokenHash: string, expiraEn: Date): Promise<void>;
  buscarPorTokenHash(tokenHash: string): Promise<{ usuarioId: string; expiraEn: Date } | null>;
  eliminarPorTokenHash(tokenHash: string): Promise<void>;
  eliminarDeUsuario(usuarioId: string): Promise<void>;
}

export type UsuarioPublico = { id: string; nombre: string; correo: string };
export type ResultadoLogin =
  | { ok: true; token: string; expiraEn: Date; usuario: UsuarioPublico }
  | { ok: false };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function crearAuthService(deps: {
  usuarios: UsuarioRepo;
  sesiones: SesionRepo;
  ahora?: () => Date;
}) {
  const ahora = deps.ahora ?? (() => new Date());
  let hashFalso: Promise<string> | undefined;
  const obtenerHashFalso = () =>
    (hashFalso ??= argonHash("contrasena-falsa-para-igualar-tiempos", ARGON_OPTS));

  async function login(correo: string, clave: string): Promise<ResultadoLogin> {
    const ahoraDt = ahora();
    const usuario = await deps.usuarios.buscarPorCorreo(correo.trim().toLowerCase());
    const bloqueado = !!usuario?.bloqueadoHasta && usuario.bloqueadoHasta > ahoraDt;

    if (!usuario || !usuario.activo || bloqueado) {
      await argonVerify(await obtenerHashFalso(), clave).catch(() => false);
      return { ok: false };
    }

    const valida = await argonVerify(usuario.hashContrasena, clave).catch(() => false);
    if (!valida) {
      // El conteo se hace en la base de datos para que intentos simultáneos no se pierdan
      await deps.usuarios.registrarFallo(usuario.id, MAX_INTENTOS, new Date(ahoraDt.getTime() + BLOQUEO_MS));
      return { ok: false };
    }

    await deps.usuarios.registrarExito(usuario.id, ahoraDt);
    const token = randomBytes(32).toString("base64url");
    const expiraEn = new Date(ahoraDt.getTime() + SESION_MS);
    await deps.sesiones.crear(usuario.id, hashToken(token), expiraEn);
    return { ok: true, token, expiraEn, usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } };
  }

  async function validarSesion(token: string | undefined): Promise<UsuarioPublico | null> {
    if (!token) return null;
    const tokenHash = hashToken(token);
    const sesion = await deps.sesiones.buscarPorTokenHash(tokenHash);
    if (!sesion) return null;
    if (sesion.expiraEn <= ahora()) {
      await deps.sesiones.eliminarPorTokenHash(tokenHash);
      return null;
    }
    const usuario = await deps.usuarios.buscarPorId(sesion.usuarioId);
    if (!usuario || !usuario.activo) return null;
    return { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo };
  }

  async function cerrarSesion(token: string | undefined): Promise<void> {
    if (token) await deps.sesiones.eliminarPorTokenHash(hashToken(token));
  }

  return { login, validarSesion, cerrarSesion };
}