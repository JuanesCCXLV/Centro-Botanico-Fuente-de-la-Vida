// Gestión de cuentas de administrador desde la terminal (npm run admin).
// Política del Plan de Pruebas 5.4: cuentas nominales, máximo 3 activas, contraseñas de 12+
// caracteres y desactivación inmediata cuando alguien deja el negocio.
import { randomBytes } from "node:crypto";
import { hash as argonHash } from "@node-rs/argon2";
import { z } from "zod";
import type { EventoRepo } from "./eventos";

export const MAX_ADMINS_ACTIVOS = 3;
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export interface AdministradorListado {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  ultimoLoginEn: Date | null;
}

export interface AdministradorRepo {
  listar(): Promise<AdministradorListado[]>;
  buscarPorCorreo(correo: string): Promise<AdministradorListado | null>;
  contarActivos(): Promise<number>;
  crear(datos: { nombre: string; correo: string; hashContrasena: string }): Promise<{ id: string }>;
  /** Cambia la contraseña y quita cualquier bloqueo por intentos fallidos. */
  cambiarClave(id: string, hashContrasena: string): Promise<void>;
  cambiarActivo(id: string, activo: boolean): Promise<void>;
  cerrarSesiones(id: string): Promise<void>;
}

export class ErrorAdministracion extends Error {}

const correoValido = z.string().trim().toLowerCase().pipe(z.email().max(254));
const nombreValido = z.string().trim().min(1).max(60);

/** Contraseña temporal de 24 caracteres, sin caracteres confusos (0/O, 1/l/I). */
export function generarClaveTemporal(): string {
  const alfabeto = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(24);
  let clave = "";
  // 256 no es múltiplo de 56: se descartan los valores altos para no sesgar la distribución
  for (let i = 0; clave.length < 24; i++) {
    const b = i < bytes.length ? bytes[i] : randomBytes(1)[0];
    if (b < 224) clave += alfabeto[b % alfabeto.length];
  }
  return clave.replace(/(.{6})(?!$)/g, "$1-");
}

export function crearAdministradoresService(deps: { administradores: AdministradorRepo; eventos: EventoRepo }) {
  const { administradores, eventos } = deps;
  const registrar = (tipo: Parameters<EventoRepo["registrar"]>[0]["tipo"], usuarioId: string) =>
    eventos.registrar({ tipo, usuarioId, recurso: "terminal" });

  async function buscar(correo: string) {
    const r = correoValido.safeParse(correo);
    if (!r.success) throw new ErrorAdministracion(`Correo inválido: ${correo}`);
    const admin = await administradores.buscarPorCorreo(r.data);
    if (!admin) throw new ErrorAdministracion(`No existe un administrador con el correo ${r.data}`);
    return admin;
  }

  async function exigirCupo() {
    const activos = await administradores.contarActivos();
    if (activos >= MAX_ADMINS_ACTIVOS) {
      throw new ErrorAdministracion(
        `Ya hay ${activos} administradores activos (máximo ${MAX_ADMINS_ACTIVOS}). Desactiva uno antes.`,
      );
    }
  }

  return {
    listar: () => administradores.listar(),

    /** Crea la cuenta con una contraseña temporal que se muestra una sola vez. */
    async crear(nombre: string, correo: string): Promise<{ correo: string; clave: string }> {
      const n = nombreValido.safeParse(nombre);
      if (!n.success) throw new ErrorAdministracion("El nombre es obligatorio (máximo 60 caracteres).");
      const c = correoValido.safeParse(correo);
      if (!c.success) throw new ErrorAdministracion(`Correo inválido: ${correo}`);
      if (await administradores.buscarPorCorreo(c.data)) {
        throw new ErrorAdministracion(`Ya existe una cuenta con el correo ${c.data}`);
      }
      await exigirCupo();

      const clave = generarClaveTemporal();
      const { id } = await administradores.crear({
        nombre: n.data,
        correo: c.data,
        hashContrasena: await argonHash(clave, ARGON_OPTS),
      });
      await registrar("ADMIN_CREADO", id);
      return { correo: c.data, clave };
    },

    /** Contraseña olvidada: asigna una temporal, desbloquea la cuenta y cierra sus sesiones. */
    async restablecerClave(correo: string): Promise<{ correo: string; clave: string }> {
      const admin = await buscar(correo);
      const clave = generarClaveTemporal();
      await administradores.cambiarClave(admin.id, await argonHash(clave, ARGON_OPTS));
      await administradores.cerrarSesiones(admin.id);
      await registrar("ADMIN_CLAVE_RESTABLECIDA", admin.id);
      return { correo: admin.correo, clave };
    },

    /** Alguien dejó el negocio: no puede volver a entrar y sus sesiones se cierran ya. */
    async desactivar(correo: string): Promise<void> {
      const admin = await buscar(correo);
      if (!admin.activo) throw new ErrorAdministracion(`${admin.correo} ya está desactivado.`);
      if ((await administradores.contarActivos()) <= 1) {
        throw new ErrorAdministracion("Es el único administrador activo: crea o activa otro antes de desactivarlo.");
      }
      await administradores.cambiarActivo(admin.id, false);
      await administradores.cerrarSesiones(admin.id);
      await registrar("ADMIN_DESACTIVADO", admin.id);
    },

    async activar(correo: string): Promise<void> {
      const admin = await buscar(correo);
      if (admin.activo) throw new ErrorAdministracion(`${admin.correo} ya está activo.`);
      await exigirCupo();
      await administradores.cambiarActivo(admin.id, true);
      await registrar("ADMIN_ACTIVADO", admin.id);
    },
  };
}
