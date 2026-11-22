import { beforeAll, describe, expect, it } from "vitest";
import { hash } from "@node-rs/argon2";
import {
  BLOQUEO_MS,
  MAX_FALLOS_IP,
  MAX_INTENTOS,
  SESION_MS,
  VENTANA_IP_MS,
  crearAuthService,
  hashToken,
  type TipoEvento,
  type UsuarioAuth,
} from "@/services/auth.service";

const CLAVE = "clave-de-prueba-larga-1";
const CLAVE_NUEVA = "otra-clave-bien-larga-2";
const CORREO = "admin@ejemplo.local";
const IP = "203.0.113.7";
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
  const eventos: { tipo: TipoEvento; usuarioId: string | null; ip: string | null; creadoEn: Date }[] = [];

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
      actualizarHash: async (id, h) => {
        usuarios.get(id)!.hashContrasena = h;
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
    eventos: {
      registrar: async (e) => {
        eventos.push({ tipo: e.tipo, usuarioId: e.usuarioId ?? null, ip: e.ip ?? null, creadoEn: reloj });
      },
      contarPorIpDesde: async (tipo, ip, desde) =>
        eventos.filter((e) => e.tipo === tipo && e.ip === ip && e.creadoEn >= desde).length,
    },
  });
  return { servicio, usuarios, sesiones, eventos, avanzar: (ms: number) => { reloj = new Date(reloj.getTime() + ms); } };
}

async function loginOk(servicio: ReturnType<typeof montar>["servicio"], clave = CLAVE) {
  const r = await servicio.login(CORREO, clave);
  if (!r.ok) throw new Error("login falló");
  return r;
}

describe("AuthService · login", () => {
  it("inicia sesión con datos válidos, guarda solo el hash del token y registra el evento", async () => {
    const { servicio, sesiones, eventos } = montar();
    const r = await servicio.login(CORREO, CLAVE, { ip: IP });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(sesiones.has(r.token)).toBe(false);
    expect(sesiones.has(hashToken(r.token))).toBe(true);
    expect(eventos).toMatchObject([{ tipo: "LOGIN_EXITOSO", usuarioId: "u1", ip: IP }]);
  });

  it("rechaza clave incorrecta y correo inexistente con el mismo resultado", async () => {
    const { servicio, eventos } = montar();
    expect(await servicio.login(CORREO, "incorrecta")).toEqual({ ok: false });
    expect(await servicio.login("nadie@ejemplo.local", CLAVE)).toEqual({ ok: false });
    expect(eventos.map((e) => e.tipo)).toEqual(["LOGIN_FALLIDO", "LOGIN_FALLIDO"]);
  });

  it("bloquea tras varios fallos, incluso con la clave correcta, y desbloquea con el tiempo", async () => {
    const { servicio, avanzar } = montar();
    for (let i = 0; i < MAX_INTENTOS; i++) await servicio.login(CORREO, "incorrecta");
    expect((await servicio.login(CORREO, CLAVE)).ok).toBe(false);
    avanzar(BLOQUEO_MS + 1000);
    expect((await servicio.login(CORREO, CLAVE)).ok).toBe(true);
  });

  it("cuenta los fallos simultáneos y bloquea igual", async () => {
    const { servicio, usuarios } = montar();
    await Promise.all(Array.from({ length: MAX_INTENTOS }, () => servicio.login(CORREO, "incorrecta")));
    expect(usuarios.get("u1")!.bloqueadoHasta).not.toBeNull();
    expect((await servicio.login(CORREO, CLAVE)).ok).toBe(false);
  });

  it("limita por IP aunque se prueben correos distintos (CS-14) y libera al pasar la ventana", async () => {
    const { servicio, eventos, avanzar } = montar();
    for (let i = 0; i < MAX_FALLOS_IP; i++) await servicio.login(`otro${i}@ejemplo.local`, "x", { ip: IP });
    expect((await servicio.login(CORREO, CLAVE, { ip: IP })).ok).toBe(false);
    expect(eventos.at(-1)?.tipo).toBe("LOGIN_LIMITADO");
    // Otra IP no se ve afectada
    expect((await servicio.login(CORREO, CLAVE, { ip: "198.51.100.1" })).ok).toBe(true);
    avanzar(VENTANA_IP_MS + 1000);
    expect((await servicio.login(CORREO, CLAVE, { ip: IP })).ok).toBe(true);
  });
});

describe("AuthService · sesiones", () => {
  it("valida la sesión, la invalida al cerrar y la rechaza si expiró", async () => {
    const { servicio, eventos, avanzar } = montar();
    const r = await loginOk(servicio);
    expect((await servicio.validarSesion(r.token))?.correo).toBe(CORREO);
    await servicio.cerrarSesion(r.token);
    expect(await servicio.validarSesion(r.token)).toBeNull();
    expect(eventos.at(-1)?.tipo).toBe("LOGOUT");

    const r2 = await loginOk(servicio);
    avanzar(SESION_MS + 1000);
    expect(await servicio.validarSesion(r2.token)).toBeNull();
  });

  it("no valida tokens vacíos o inventados", async () => {
    const { servicio } = montar();
    expect(await servicio.validarSesion(undefined)).toBeNull();
    expect(await servicio.validarSesion("token-inventado")).toBeNull();
  });
});

describe("AuthService · cambiar contraseña (HU-11, CP-21)", () => {
  it("exige la contraseña actual", async () => {
    const { servicio } = montar();
    expect(await servicio.cambiarContrasena("u1", "incorrecta", CLAVE_NUEVA)).toEqual({
      ok: false,
      error: "CLAVE_ACTUAL_INCORRECTA",
    });
  });

  it("rechaza claves nuevas cortas", async () => {
    const { servicio } = montar();
    expect(await servicio.cambiarContrasena("u1", CLAVE, "corta")).toEqual({ ok: false, error: "CLAVE_INVALIDA" });
  });

  it("cambia la clave, cierra las demás sesiones y entrega una sesión nueva", async () => {
    const { servicio, eventos } = montar();
    const otroDispositivo = await loginOk(servicio);
    const actual = await loginOk(servicio);

    const r = await servicio.cambiarContrasena("u1", CLAVE, CLAVE_NUEVA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(await servicio.validarSesion(otroDispositivo.token)).toBeNull();
    expect(await servicio.validarSesion(actual.token)).toBeNull();
    expect(await servicio.validarSesion(r.token)).not.toBeNull();
    expect((await servicio.login(CORREO, CLAVE)).ok).toBe(false);
    expect((await servicio.login(CORREO, CLAVE_NUEVA)).ok).toBe(true);
    expect(eventos.some((e) => e.tipo === "CAMBIO_CONTRASENA")).toBe(true);
  });
});
