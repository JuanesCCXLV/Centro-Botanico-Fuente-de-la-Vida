import type { MetadataRoute } from "next";
import { obtenerProductos } from "@/lib/catalogo";
import { env } from "@/lib/env";
import { absoluta } from "@/lib/seo";

/** RNF-11: mapa del sitio con el catálogo, el local y cada producto visible. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productos = await obtenerProductos();
  const url = (ruta: string) => absoluta(env.SITE_URL, ruta);
  const ultimaActualizacion = productos.reduce<Date | undefined>(
    (max, p) => (!max || p.actualizadoEn > max ? p.actualizadoEn : max),
    undefined,
  );

  return [
    { url: url("/"), lastModified: ultimaActualizacion, changeFrequency: "weekly", priority: 1 },
    { url: url("/local"), changeFrequency: "monthly", priority: 0.6 },
    ...productos.map((p) => ({
      url: url(`/productos/${p.slug}`),
      lastModified: p.actualizadoEn,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
