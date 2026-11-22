// Lecturas públicas cacheadas. El panel invalida la etiqueta con updateTag(TAG_CATALOGO)
// después de cada cambio, así el sitio muestra los datos nuevos de inmediato.
import { cacheLife, cacheTag } from "next/cache";
import { catalogoRepository } from "@/repositories/catalogo.repository";
import { crearCatalogoService } from "@/services/catalogo.service";
import { TAG_CATALOGO } from "@/lib/catalogo-tags";
import { infoLocalService } from "@/lib/servicios-panel";

const catalogo = crearCatalogoService(catalogoRepository);

export async function obtenerProductos() {
  "use cache";
  cacheTag(TAG_CATALOGO);
  cacheLife("days");
  return catalogo.listarProductos();
}

export async function obtenerCategorias() {
  "use cache";
  cacheTag(TAG_CATALOGO);
  cacheLife("days");
  return catalogo.listarCategorias();
}

export async function obtenerProducto(slug: string) {
  "use cache";
  cacheTag(TAG_CATALOGO);
  cacheLife("days");
  return catalogo.obtenerProducto(slug);
}

export async function obtenerInfoLocal() {
  "use cache";
  cacheTag(TAG_CATALOGO);
  cacheLife("days");
  return infoLocalService.obtener();
}
