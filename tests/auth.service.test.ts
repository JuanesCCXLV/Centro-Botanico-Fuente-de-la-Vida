import { beforeAll, describe, expect, it } from "vitest";
import { hash } from "@node-rs/argon2";
import { BLOQUEO_MS, MAX_INTENTOS, SESION_MS, crearAuthService, hashToken, type UsuarioAuth } from "@/services/auth.service";

const CLAVE = "clave-de-prueba-larga-1";
const CORREO = "admin@ejemplo.local";
let HASH: string;

beforeAll(async () => {
  HASH = await hash(CLAVE, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
});

function montar() {
  let reloj = new Date("2026-01-01T10:00:00Z");
  const usuarios = new Map<string, UsuarioAuth>([
    ["u1", { id: "u1", nombre: "Admin", correo: CORREO, hashContrasena: HASH, activo: true, intentosFallidos: 0, bloqueadoHasta: null }],
  ]);
  const sesiones = new Map<string, { usuarioId: string; expiraEn: Date }>();
  const servicio = crearAuthService({
    ahora: () => reloj,
    usuarios: {
      buscarPorCorreo: async (c) => [...usuarios.values()].find((u) => u.correo === c) ?? null,
      buscarPorId: async (id) => usuarios.get(id) ?? null,
      registrarFallo: async (id, maxIntentos, bloquearHasta) => {
        const u = usuarios.get(id)!;
        u.intentosFallidos += 1;
        if (u.intentosFallidos >= maxIntentos) Object.assign(u, { intentosFallidos: 0, bloqueadoHasta: bloquearHasta });
      },
      registrarExito: async (id) => {
        Object.assign(usuarios.get(id)!, { intentosFallidos: 0, bloqueadoHasta: null });
      },
    },
    sesiones: {
      crear: async (usuarioId, tokenHash, expiraEn) => { sesiones.set(tokenHash, { usuarioId, expiraEn }); },
      buscarPorTokenHash: async (h) => sesiones.get(h) ?? null,
      eliminarPorTokenHash: async (h) => { sesiones.delete(h); },
      eliminarDeUsuario: async (id) => {
        for (const [h, s] of sesiones) if (s.usuarioId === id) sesiones.delete(h);
      },
    },
  });
  return { servicio, usuarios, sesiones, avanzar: (ms: number) => { reloj = new Date(reloj.getTime() + ms); } };
}

describe("AuthService", () => {
  it("inicia sesión con datos válidos y guarda solo el hash del token", async () => {
    const { servicio, sesiones } = montar();
    const r = await servicio.login(CORREO, CLAVE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sesiones.has(r.token)).toBe(false);
    expect(sesiones.has(hashToken(r.token))).toBe(true);
  });

  it("rechaza clave incorrecta y correo inexistente con el mismo resultado", async () => {
    const { servicio } = montar();
    expect(await servicio.login(CORREO, "incorrecta")).toEqual({ ok: false });
    expect(await servicio.login("nadie@ejemplo.local", CLAVE)).toEqual({ ok: false });
  });

  it("bloquea tras varios fallos, incluso con la clave correcta, y desbloquea con el tiempo", async () => {
    const { servicio, avanzar } = montar();
    for (let i = 0; i < MAX_INTENTOS; i++) await servicio.login(CORREO, "incorrecta");
    expect((await servicio.login(CORREO, CLAVE)).ok).toBe(false);
    avanzar(BLOQUEO_MS + 1000);
    expect((await servicio.login(CORREO, CLAVE)).ok).toBe(true);
  });

  it("valida la sesión, la invalida al cerrar y la rechaza si expiró", async () => {
    const { servicio, avanzar } = montar();
    const r = await servicio.login(CORREO, CLAVE);
    if (!r.ok) throw new Error("login falló");
    expect((await servicio.validarSesion(r.token))?.correo).toBe(CORREO);
    await servicio.cerrarSesion(r.token);
    expect(await servicio.validarSesion(r.token)).toBeNull();

    const r2 = await servicio.login(CORREO, CLAVE);
    if (!r2.ok) throw new Error("login falló");
    avanzar(SESION_MS + 1000);
    expect(await servicio.validarSesion(r2.token)).toBeNull();
  });

  it("cuenta los fallos simultáneos y bloquea igual", async () => {
    const { servicio, usuarios } = montar();
    await Promise.all(Array.from({ length: MAX_INTENTOS }, () => servicio.login(CORREO, "incorrecta")));
    expect(usuarios.get("u1")!.bloqueadoHasta).not.toBeNull();
    expect((await servicio.login(CORREO, CLAVE)).ok).toBe(false);
  });

  it("no valida tokens vacíos o inventados", async () => {
    const { servicio } = montar();
    expect(await servicio.validarSesion(undefined)).toBeNull();
    expect(await servicio.validarSesion("token-inventado")).toBeNull();
  });
});
