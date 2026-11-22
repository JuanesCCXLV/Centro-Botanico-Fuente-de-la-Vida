// Datos estructurados (schema.org) para que Google muestre precio, dirección, etc. (RNF-11)
import type { DatosInfoLocal } from "@/lib/validaciones/info-local";
import type { ProductoPublico } from "@/services/catalogo.service";

export const NOMBRE_SITIO = "Centro Botánico Fuente de la Vida";

/** URL absoluta a partir de la base del sitio; deja intactas las que ya son absolutas. */
export function absoluta(base: string, ruta: string): string {
  return new URL(ruta, base.endsWith("/") ? base : `${base}/`).toString();
}

/** Recorta en un límite de palabra para la meta descripción. */
export function resumen(texto: string, max = 155): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  return `${corte.slice(0, corte.lastIndexOf(" ") > 0 ? corte.lastIndexOf(" ") : corte.length)}…`;
}

export function jsonLdProducto(p: ProductoPublico, base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: resumen(p.descripcion, 500),
    image: p.imagenes.map((i) => absoluta(base, i.url)),
    category: p.categoria.nombre,
    url: absoluta(base, `/productos/${p.slug}`),
    offers: {
      "@type": "Offer",
      price: p.precioCop,
      priceCurrency: "COP",
      availability: "https://schema.org/InStoreOnly",
      seller: { "@type": "Organization", name: NOMBRE_SITIO },
    },
  };
}

export function jsonLdLocal(info: DatosInfoLocal, base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: NOMBRE_SITIO,
    url: base,
    address: {
      "@type": "PostalAddress",
      streetAddress: info.direccion,
      addressLocality: "Cali",
      addressRegion: "Valle del Cauca",
      addressCountry: "CO",
    },
    telephone: info.telefonos[0] ?? `+${info.whatsapp}`,
    ...(info.correo ? { email: info.correo } : {}),
    ...(info.latitud !== null && info.longitud !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: info.latitud, longitude: info.longitud } }
      : {}),
    sameAs: Object.values(info.redesSociales),
  };
}

/** Serializa para <script type="application/ld+json"> sin permitir cerrar la etiqueta (XSS). */
export function serializarJsonLd(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
