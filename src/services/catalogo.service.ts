// Catálogo público (HU-01 a HU-03). Solo expone productos visibles de categorías visibles.

export interface ProductoPublico {
  id: number;
  nombre: string;
  slug: string;
  descripcion: string;
  presentacion: string | null;
  usoSugerido: string | null;
  precioCop: number;
  registroSanitario: string | null;
  destacado: boolean;
  actualizadoEn: Date;
  categoria: { nombre: string; slug: string };
  imagenes: { tipo: "FRONTAL" | "POSTERIOR"; url: string; textoAlternativo: string | null }[];
}

export interface CategoriaPublica {
  nombre: string;
  slug: string;
}

export interface CatalogoRepo {
  listarProductosVisibles(): Promise<ProductoPublico[]>;
  buscarProductoVisible(slug: string): Promise<ProductoPublico | null>;
  listarCategoriasVisibles(): Promise<CategoriaPublica[]>;
}

/** Minúsculas y sin tildes: "Té Verde" y "te verde" coinciden (CP-04). */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export type FiltrosCatalogo = { categoria?: string; q?: string };

/** HU-02: filtra por categoría (slug) y busca por palabras en nombre, presentación y categoría. */
export function filtrarCatalogo(productos: ProductoPublico[], filtros: FiltrosCatalogo): ProductoPublico[] {
  const palabras = normalizar(filtros.q ?? "").split(/\s+/).filter(Boolean);
  return productos.filter((p) => {
    if (filtros.categoria && p.categoria.slug !== filtros.categoria) return false;
    if (palabras.length === 0) return true;
    const texto = normalizar(`${p.nombre} ${p.presentacion ?? ""} ${p.categoria.nombre}`);
    return palabras.every((palabra) => texto.includes(palabra));
  });
}

/** Destacados primero y luego por nombre, en orden alfabético español. */
export function ordenarCatalogo(productos: ProductoPublico[]): ProductoPublico[] {
  return [...productos].sort(
    (a, b) => Number(b.destacado) - Number(a.destacado) || a.nombre.localeCompare(b.nombre, "es"),
  );
}

export function textoAlternativo(p: Pick<ProductoPublico, "nombre">, imagen: ProductoPublico["imagenes"][number]) {
  return imagen.textoAlternativo ?? `${p.nombre}, vista ${imagen.tipo === "FRONTAL" ? "frontal" : "posterior"}`;
}

export function crearCatalogoService(repo: CatalogoRepo) {
  return {
    listarProductos: async () => ordenarCatalogo(await repo.listarProductosVisibles()),
    obtenerProducto: (slug: string) =>
      /^[a-z0-9-]{1,100}$/.test(slug) ? repo.buscarProductoVisible(slug) : Promise.resolve(null),
    listarCategorias: () => repo.listarCategoriasVisibles(),
  };
}
