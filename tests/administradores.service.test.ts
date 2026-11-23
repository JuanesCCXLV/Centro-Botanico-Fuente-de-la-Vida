import { verify } from "@node-rs/argon2";
import { describe, expect, it } from "vitest";
import {
  ErrorAdministracion,
  MAX_ADMINS_ACTIVOS,
  crearAdministradoresService,
  generarClaveTemporal,
  type AdministradorRepo,
} from "@/services/administradores.service";
import type { TipoEvento } from "@/services/eventos";

type Fila = { id: string; nombre: string; correo: string; activo: boolean; ultimoLoginEn: Date | null; hash: string };

function montar(iniciales: Partial<Fila>[] = [{ nombre: "Admin", correo: "admin@ejemplo.local" }]) {
  const filas = new Map<string, Fila>();
  const sesiones = new Map<string, number>();
  const bloqueos = new Set<string>();
  let n = 0;
  for (const f of iniciales) {
    const id = `u${++n}`;
    filas.set(id, { id, nombre: "", correo: "", activo: true, ultimoLoginEn: null, hash: "x", ...f });
    sesiones.set(id, 2);
    bloqueos.add(id);
  }
  const eventos: TipoEvento[] = [];
  const publico = (f: Fila) => ({
    id: f.id,
    nombre: f.nombre,
    correo: f.correo,
    activo: f.activo,
    ultimoLoginEn: f.ultimoLoginEn,
  });

  const repo: AdministradorRepo = {
    listar: async () => [...filas.values()].map(publico),
    buscarPorCorreo: async (c) => {
      const f = [...filas.values()].find((x) => x.correo === c);
      return f ? publico(f) : null;
    },
    contarActivos: async () => [...filas.values()].filter((f) => f.activo).length,
    crear: async ({ nombre, correo, hashContrasena }) => {
      const id = `u${++n}`;
      filas.set(id, { id, nombre, correo, activo: true, ultimoLoginEn: null, hash: hashContrasena });
      return { id };
    },
    cambiarClave: async (id, hash) => {
      filas.get(id)!.hash = hash;
      bloqueos.delete(id);
    },
    cambiarActivo: async (id, activo) => {
      filas.get(id)!.activo = activo;
    },
    cerrarSesiones: async (id) => {
      sesiones.set(id, 0);
    },
  };

  const servicio = crearAdministradoresService({
    administradores: repo,
    eventos: { registrar: async (e) => void eventos.push(e.tipo), contarPorIpDesde: async () => 0 },
  });
  return { servicio, filas, sesiones, bloqueos, eventos };
}

describe("generarClaveTemporal", () => {
  it("cumple la política (12+ caracteres), sin caracteres confusos y distinta cada vez", () => {
    const claves = new Set(Array.from({ length: 50 }, generarClaveTemporal));
    expect(claves.size).toBe(50);
    for (const c of claves) {
      expect(c).toMatch(/^[a-zA-Z2-9]{6}(-[a-zA-Z2-9]{6}){3}$/);
      expect(c).not.toMatch(/[01lIoO]/);
    }
  });
});

describe("AdministradoresService", () => {
  it("crea una cuenta con correo normalizado y una contraseña temporal válida", async () => {
    const { servicio, filas, eventos } = montar();
    const r = await servicio.crear("  Ana Pérez ", " Ana@Ejemplo.COM ");
    expect(r.correo).toBe("ana@ejemplo.com");
    const nueva = [...filas.values()].find((f) => f.correo === "ana@ejemplo.com")!;
    expect(nueva.nombre).toBe("Ana Pérez");
    expect(await verify(nueva.hash, r.clave)).toBe(true);
    expect(eventos).toEqual(["ADMIN_CREADO"]);
  });

  it("rechaza correos repetidos o inválidos y nombres vacíos", async () => {
    const { servicio } = montar();
    await expect(servicio.crear("Otro", "admin@ejemplo.local")).rejects.toThrow(ErrorAdministracion);
    await expect(servicio.crear("Otro", "no-es-correo")).rejects.toThrow(/Correo inválido/);
    await expect(servicio.crear("  ", "b@ejemplo.local")).rejects.toThrow(/nombre/);
  });

  it(`no permite más de ${MAX_ADMINS_ACTIVOS} administradores activos`, async () => {
    const { servicio } = montar([
      { correo: "a@x.co", nombre: "A" },
      { correo: "b@x.co", nombre: "B" },
      { correo: "c@x.co", nombre: "C", activo: false },
    ]);
    await servicio.activar("c@x.co");
    await expect(servicio.crear("D", "d@x.co")).rejects.toThrow(/máximo 3/);
  });

  it("restablecer la clave la cambia, desbloquea la cuenta y cierra sus sesiones", async () => {
    const { servicio, filas, sesiones, bloqueos, eventos } = montar();
    const r = await servicio.restablecerClave("ADMIN@ejemplo.local");
    expect(await verify(filas.get("u1")!.hash, r.clave)).toBe(true);
    expect(bloqueos.has("u1")).toBe(false);
    expect(sesiones.get("u1")).toBe(0);
    expect(eventos).toEqual(["ADMIN_CLAVE_RESTABLECIDA"]);
  });

  it("desactivar cierra sus sesiones, pero no deja el panel sin administradores", async () => {
    const { servicio, filas, sesiones } = montar([
      { correo: "a@x.co", nombre: "A" },
      { correo: "b@x.co", nombre: "B" },
    ]);
    await servicio.desactivar("b@x.co");
    expect(filas.get("u2")!.activo).toBe(false);
    expect(sesiones.get("u2")).toBe(0);
    await expect(servicio.desactivar("a@x.co")).rejects.toThrow(/único administrador activo/);
    await expect(servicio.desactivar("b@x.co")).rejects.toThrow(/ya está desactivado/);
    await expect(servicio.restablecerClave("nadie@x.co")).rejects.toThrow(/No existe/);
  });
});
