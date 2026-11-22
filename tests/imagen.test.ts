import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { crearLocalStorage } from "@/lib/almacenamiento/local-storage";
import { TAMANO_MAX_IMAGEN, detectarFormato, validarImagen } from "@/lib/validaciones/imagen";

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe("validarImagen (CS-12)", () => {
  it("detecta JPG, PNG y WebP por su contenido", () => {
    expect(detectarFormato(JPG)).toBe("jpg");
    expect(detectarFormato(PNG)).toBe("png");
    expect(detectarFormato(WEBP)).toBe("webp");
    expect(detectarFormato(SVG)).toBeNull();
  });

  it("acepta una imagen válida", () => {
    expect(validarImagen(PNG, "image/png")).toEqual({ ok: true, formato: "png" });
  });

  it("rechaza SVG con script, tipos no permitidos y archivos vacíos", () => {
    expect(validarImagen(SVG, "image/svg+xml").ok).toBe(false);
    expect(validarImagen(JPG, "application/pdf").ok).toBe(false);
    expect(validarImagen(new Uint8Array(), "image/png").ok).toBe(false);
  });

  it("rechaza extensión o tipo MIME falsos (un SVG que dice ser PNG)", () => {
    expect(validarImagen(SVG, "image/png").ok).toBe(false);
    expect(validarImagen(JPG, "image/png").ok).toBe(false);
  });

  it("rechaza archivos mayores a 5 MB", () => {
    const grande = new Uint8Array(TAMANO_MAX_IMAGEN + 1);
    grande.set(PNG);
    expect(validarImagen(grande, "image/png").ok).toBe(false);
  });
});

describe("almacenamiento local", () => {
  const dirs: string[] = [];
  afterAll(async () => {
    await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
  });

  it("guarda con nombre generado por el servidor y lo elimina", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    dirs.push(dir);
    const storage = crearLocalStorage(dir);

    const r = await storage.subir(PNG, "png", "productos");
    expect(r.url).toMatch(/^\/uploads\/productos\/[0-9a-f-]{36}\.png$/);
    const archivo = path.join(dir, "uploads", r.idPublico);
    expect(await readFile(archivo)).toEqual(Buffer.from(PNG));

    await storage.eliminar(r.idPublico);
    await expect(stat(archivo)).rejects.toThrow();
  });

  it("no permite salir de la carpeta de subidas (../)", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "uploads-"));
    dirs.push(dir);
    const storage = crearLocalStorage(dir);
    await expect(storage.subir(PNG, "png", "../fuera")).rejects.toThrow();
    await expect(storage.eliminar("../../etc/passwd")).rejects.toThrow();
  });
});
