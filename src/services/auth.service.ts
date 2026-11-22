import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

export const MAX_INTENTOS = 5;
export const BLOQUEO_MS = 15 * 60 * 1000;
export const SESION_MS = 7 * 24 * 60 * 60 * 1000;
/** Fallos permitidos desde una misma IP (a cualquier cuenta) dentro de la ventana (CS-14). */
export const MAX_FALLOS_IP = 20;
export const VENTANA_IP_MS = 15 * 60 * 1000;
export const LONGITUD_MIN_CLAVE = 12;
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
  actualizarHash(id: string, hashContrasena: string): Promise<void>;
}

export interface SesionRepo {
  crear(usuarioId: string, tokenHash: string, expiraEn: Date): Promise<void>;
  buscarPorTokenHash(tokenHash: string): Promise<{ usuarioId: string; expiraEn: Date } | null>;
  eliminarPorTokenHash(tokenHash: string): Promise<void>;
  eliminarDeUsuario(usuarioId: string): Promise<void>;
}

export type TipoEvento = "LOGIN_EXITOSO" | "LOGIN_FALLIDO" | "LOGIN_LIMITADO" | "LOGOUT" | "CAMBIO_CONTRASENA";

export interface EventoRepo {
  registrar(evento: { tipo: TipoEvento; usuarioId?: string | null; ip?: string | null }): Promise<void>;
  contarPorIpDesde(tipo: TipoEvento, ip: string, desde: Date): Promise<number>;
}

/** Datos de la petición que el servicio usa para auditoría y límites. */
export type Contexto = { ip?: string | null };

export type UsuarioPublico = { id: string; nombre: string; correo: string };
export type SesionNueva = { token: string; expiraEn: Date };
export type ResultadoLogin = ({ ok: true; usuario: UsuarioPublico } & SesionNueva) | { ok: false };
export type ResultadoCambioClave =
  | ({ ok: true } & SesionNueva)
  | { ok: false; error: "CLAVE_ACTUAL_INCORRECTA" | "CLAVE_INVALIDA" | "USUARIO_NO_ENCONTRADO" };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function crearAuthService(deps: {
  usuarios: UsuarioRepo;
  sesiones: SesionRepo;
  eventos: EventoRepo;
  ahora?: () => Date;
}) {
  const ahora = deps.ahora ?? (() => new Date());
  let hashFalso: Promise<string> | undefined;
  const obtenerHashFalso = () =>
    (hashFalso ??= argonHash("contrasena-falsa-para-igualar-tiempos", ARGON_OPTS));

  async function abrirSesion(usuarioId: string, ahoraDt: Date): Promise<SesionNueva> {
    const token = randomBytes(32).toString("base64url");
    const expiraEn = new Date(ahoraDt.getTime() + SESION_MS);
    await deps.sesiones.crear(usuarioId, hashToken(token), expiraEn);
    return { token, expiraEn };
  }

  async function ipExcedida(ip: string | null | undefined, ahoraDt: Date): Promise<boolean> {
    if (!ip) return false;
    const desde = new Date(ahoraDt.getTime() - VENTANA_IP_MS);
    return (await deps.eventos.contarPorIpDesde("LOGIN_FALLIDO", ip, desde)) >= MAX_FALLOS_IP;
  }

  async function login(correo: string, clave: string, ctx: Contexto = {}): Promise<ResultadoLogin> {
    const ahoraDt = ahora();
    const ip = ctx.ip ?? null;

    if (await ipExcedida(ip, ahoraDt)) {
      await deps.eventos.registrar({ tipo: "LOGIN_LIMITADO", ip });
      return { ok: false };
    }

    const usuario = await deps.usuarios.buscarPorCorreo(correo.trim().toLowerCase());
    const bloqueado = !!usuario?.bloqueadoHasta && usuario.bloqueadoHasta > ahoraDt;

    if (!usuario || !usuario.activo || bloqueado) {
      await argonVerify(await obtenerHashFalso(), clave).catch(() => false);
      await deps.eventos.registrar({ tipo: "LOGIN_FALLIDO", usuarioId: usuario?.id ?? null, ip });
      return { ok: false };
    }

    const valida = await argonVerify(usuario.hashContrasena, clave).catch(() => false);
    if (!valida) {
      // El conteo se hace en la base de datos para que intentos simultáneos no se pierdan
      await deps.usuarios.registrarFallo(usuario.id, MAX_INTENTOS, new Date(ahoraDt.getTime() + BLOQUEO_MS));
      await deps.eventos.registrar({ tipo: "LOGIN_FALLIDO", usuarioId: usuario.id, ip });
      return { ok: false };
    }

    await deps.usuarios.registrarExito(usuario.id, ahoraDt);
    const sesion = await abrirSesion(usuario.id, ahoraDt);
    await deps.eventos.registrar({ tipo: "LOGIN_EXITOSO", usuarioId: usuario.id, ip });
    return { ok: true, ...sesion, usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo } };
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

  async function cerrarSesion(token: string | undefined, ctx: Contexto = {}): Promise<void> {
    if (!token) return;
    const tokenHash = hashToken(token);
    const sesion = await deps.sesiones.buscarPorTokenHash(tokenHash);
    await deps.sesiones.eliminarPorTokenHash(tokenHash);
    if (sesion) await deps.eventos.registrar({ tipo: "LOGOUT", usuarioId: sesion.usuarioId, ip: ctx.ip ?? null });
  }

  /**
   * HU-11 / CP-21: exige la contraseña actual, guarda la nueva y cierra TODAS las sesiones
   * del usuario. Devuelve una sesión nueva para que quien hizo el cambio siga conectado.
   */
  async function cambiarContrasena(
    usuarioId: string,
    actual: string,
    nueva: string,
    ctx: Contexto = {},
  ): Promise<ResultadoCambioClave> {
    if (nueva.length < LONGITUD_MIN_CLAVE || nueva.length > 256) return { ok: false, error: "CLAVE_INVALIDA" };

    const usuario = await deps.usuarios.buscarPorId(usuarioId);
    if (!usuario || !usuario.activo) return { ok: false, error: "USUARIO_NO_ENCONTRADO" };

    const valida = await argonVerify(usuario.hashContrasena, actual).catch(() => false);
    if (!valida) return { ok: false, error: "CLAVE_ACTUAL_INCORRECTA" };

    await deps.usuarios.actualizarHash(usuario.id, await argonHash(nueva, ARGON_OPTS));
    await deps.sesiones.eliminarDeUsuario(usuario.id);
    const sesion = await abrirSesion(usuario.id, ahora());
    await deps.eventos.registrar({ tipo: "CAMBIO_CONTRASENA", usuarioId: usuario.id, ip: ctx.ip ?? null });
    return { ok: true, ...sesion };
  }

  return { login, validarSesion, cerrarSesion, cambiarContrasena };
}
