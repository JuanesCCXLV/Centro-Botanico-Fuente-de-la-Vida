import { describe, expect, it } from "vitest";
import {
  crearCatalogoService,
  filtrarCatalogo,
  normalizar,
  ordenarCatalogo,
  textoAlternativo,
  type ProductoPublico,
} from "@/services/catalogo.service";

function producto(id: number, nombre: string, categoria: string, extra: Partial<ProductoPublico> = {}): ProductoPublico {
  return {
    id,
    nombre,
    slug: `p-${id}`,
    descripcion: "",
    presentacion: null,
    usoSugerido: null,
    precioCop: 10000,
    registroSanitario: null,
    destacado: false,
    actualizadoEn: new Date("2026-01-01"),
    categoria: { nombre: categoria, slug: normalizar(categoria).replace(/\s+/g, "-") },
    imagenes: [],
    ...extra,
  };
}

const productos = [
  producto(1, "Té verde", "Infusiones"),
  producto(2, "Árnica en gel", "Cuidado personal", { presentacion: "Tubo x 60 g" }),
  producto(3, "Té de manzanilla", "Infusiones"),
  producto(4, "Colágeno hidrolizado", "Suplementos", { destacado: true }),
];

describe("filtrarCatalogo (HU-02)", () => {
  it("filtra por categoría", () => {
    expect(filtrarCatalogo(productos, { categoria: "infusiones" }).map((p) => p.id)).toEqual([1, 3]);
  });

  it("busca sin importar tildes ni mayúsculas (CP-04)", () => {
    expect(filtrarCatalogo(productos, { q: "ARNICA" }).map((p) => p.id)).toEqual([2]);
    expect(filtrarCatalogo(productos, { q: "te" }).map((p) => p.id)).toEqual([1, 3]);
    expect(filtrarCatalogo(productos, { q: "té" }).map((p) => p.id)).toEqual([1, 3]);
  });

  it("exige todas las palabras y también busca en la presentación y la categoría", () => {
    expect(filtrarCatalogo(productos, { q: "te verde" }).map((p) => p.id)).toEqual([1]);
    expect(filtrarCatalogo(productos, { q: "tubo" }).map((p) => p.id)).toEqual([2]);
    expect(filtrarCatalogo(productos, { q: "suplementos" }).map((p) => p.id)).toEqual([4]);
  });

  it("combina categoría y búsqueda; sin coincidencias devuelve lista vacía", () => {
    expect(filtrarCatalogo(productos, { categoria: "infusiones", q: "manzanilla" }).map((p) => p.id)).toEqual([3]);
    expect(filtrarCatalogo(productos, { q: "inexistente" })).toEqual([]);
    expect(filtrarCatalogo(productos, { categoria: "no-existe" })).toEqual([]);
  });
});

describe("ordenarCatalogo y textos", () => {
  it("pone los destacados primero y luego ordena alfabéticamente en español", () => {
    expect(ordenarCatalogo(productos).map((p) => p.id)).toEqual([4, 2, 3, 1]);
  });

  it("genera texto alternativo si no hay uno guardado (RNF-12)", () => {
    const p = productos[0];
    expect(textoAlternativo(p, { tipo: "POSTERIOR", url: "/x.png", textoAlternativo: null })).toBe("Té verde, vista posterior");
  });
});

describe("crearCatalogoService", () => {
  it("rechaza slugs con caracteres extraños sin consultar la base de datos", async () => {
    let consultas = 0;
    const servicio = crearCatalogoService({
      listarProductosVisibles: async () => productos,
      buscarProductoVisible: async () => {
        consultas++;
        return productos[0];
      },
      listarCategoriasVisibles: async () => [],
    });
    expect(await servicio.obtenerProducto("../admin")).toBeNull();
    expect(await servicio.obtenerProducto("x".repeat(101))).toBeNull();
    expect(consultas).toBe(0);
    expect(await servicio.obtenerProducto("te-verde")).not.toBeNull();
  });
});
