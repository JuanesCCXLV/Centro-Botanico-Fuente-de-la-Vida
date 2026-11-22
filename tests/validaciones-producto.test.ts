import { describe, expect, it } from "vitest";
import { leerDatosProducto } from "@/lib/validaciones/producto";

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

const valido = {
  nombre: "  Té verde ",
  descripcion: "Hojas de té verde.",
  precioCop: "$ 15.000",
  categoriaId: "1",
  presentacion: "",
  visible: "on",
};

describe("leerDatosProducto (CP-13, CP-14)", () => {
  it("normaliza un formulario válido", () => {
    const r = leerDatosProducto(formulario(valido));
    expect(r).toEqual({
      ok: true,
      datos: {
        nombre: "Té verde",
        descripcion: "Hojas de té verde.",
        presentacion: null,
        usoSugerido: null,
        precioCop: 15000,
        categoriaId: 1,
        registroSanitario: null,
        visible: true,
        destacado: false,
      },
    });
  });

  it("rechaza nombre vacío, precio negativo o con texto y categoría sin elegir", () => {
    const r = leerDatosProducto(formulario({ ...valido, nombre: "   ", precioCop: "-500", categoriaId: "" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errores).sort()).toEqual(["categoriaId", "nombre", "precioCop"]);

    for (const precio of ["abc", "15000,50", "1e5", ""]) {
      expect(leerDatosProducto(formulario({ ...valido, precioCop: precio })).ok).toBe(false);
    }
  });

  it("rechaza textos demasiado largos", () => {
    expect(leerDatosProducto(formulario({ ...valido, nombre: "x".repeat(121) })).ok).toBe(false);
  });
});
