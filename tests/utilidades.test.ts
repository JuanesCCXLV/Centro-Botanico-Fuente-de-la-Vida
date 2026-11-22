import { describe, expect, it } from "vitest";
import { formatearCop } from "@/lib/formato";
import { slugificar } from "@/lib/slug";

describe("slugificar", () => {
  it("quita tildes, ñ, símbolos y espacios", () => {
    expect(slugificar("Té Verde & Menta 250g")).toBe("te-verde-menta-250g");
    expect(slugificar("  Piña  Colada!! ")).toBe("pina-colada");
    expect(slugificar("Aceite de Árnica")).toBe("aceite-de-arnica");
  });

  it("no deja guiones al inicio o al final y limita la longitud", () => {
    expect(slugificar("---hola---")).toBe("hola");
    const largo = slugificar("a ".repeat(100));
    expect(largo.length).toBeLessThanOrEqual(80);
    expect(largo.endsWith("-")).toBe(false);
  });
});

describe("formatearCop", () => {
  it("formatea pesos colombianos sin decimales y con punto de miles", () => {
    const texto = formatearCop(15000).replace(/\s/g, " ");
    expect(texto).toMatch(/^\$ ?15\.000$/);
  });
});
