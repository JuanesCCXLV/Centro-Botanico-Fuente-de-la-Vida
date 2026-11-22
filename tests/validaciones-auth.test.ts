import { describe, expect, it } from "vitest";
import { esquemaCambioClave, esquemaLogin } from "@/lib/validaciones/auth";

describe("esquemaLogin", () => {
  it("normaliza el correo a minúsculas y sin espacios", () => {
    const r = esquemaLogin.parse({ correo: "  Admin@Ejemplo.LOCAL ", clave: "x" });
    expect(r.correo).toBe("admin@ejemplo.local");
  });

  it("rechaza correos inválidos, claves vacías y entradas que no son texto", () => {
    expect(esquemaLogin.safeParse({ correo: "no-es-correo", clave: "x" }).success).toBe(false);
    expect(esquemaLogin.safeParse({ correo: "a@b.co", clave: "" }).success).toBe(false);
    expect(esquemaLogin.safeParse({ correo: null, clave: null }).success).toBe(false);
  });

  it("rechaza claves demasiado largas antes de llegar a argon2", () => {
    expect(esquemaLogin.safeParse({ correo: "a@b.co", clave: "x".repeat(257) }).success).toBe(false);
  });
});

describe("esquemaCambioClave", () => {
  const base = { actual: "clave-actual-123", nueva: "clave-nueva-larga-1", confirmacion: "clave-nueva-larga-1" };

  it("acepta datos válidos", () => {
    expect(esquemaCambioClave.safeParse(base).success).toBe(true);
  });

  it("rechaza claves cortas, confirmación distinta y clave nueva igual a la actual", () => {
    expect(esquemaCambioClave.safeParse({ ...base, nueva: "corta", confirmacion: "corta" }).success).toBe(false);
    expect(esquemaCambioClave.safeParse({ ...base, confirmacion: "otra-cosa-distinta" }).success).toBe(false);
    expect(
      esquemaCambioClave.safeParse({ ...base, nueva: base.actual, confirmacion: base.actual }).success,
    ).toBe(false);
  });
});
