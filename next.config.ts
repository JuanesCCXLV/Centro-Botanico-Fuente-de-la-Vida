import type { NextConfig } from "next";
import { entornoSitio, plataforma, resolverUrlSitio } from "./src/lib/url-sitio";

const esDesarrollo = process.env.NODE_ENV === "development";
// HSTS y upgrade-insecure-requests solo cuando el sitio se publica con HTTPS (SITE_URL de producción).
// Así `next start` también funciona en http://localhost (Lighthouse en CI, pruebas locales).
const conHttps = !esDesarrollo && resolverUrlSitio(process.env).startsWith("https://");

// CSP sin nonces (compatible con el prerenderizado de cacheComponents).
// - img-src: Cloudinary para las fotos de productos.
// - frame-src: mapa de Google en la página del local (HU-04).
// - 'unsafe-eval' solo en desarrollo (lo necesita el modo dev de React).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://res.cloudinary.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(conHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  ...(conHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Valores que dependen de la plataforma, calculados al compilar y fijados en el código.
  // En Netlify, CONTEXT, URL y DEPLOY_PRIME_URL solo existen durante el build, no al atender visitas.
  // env.ts e ip.ts los leen como process.env.SITE_URL, process.env.ENTORNO_SITIO y process.env.PLATAFORMA.
  env: {
    SITE_URL: resolverUrlSitio(process.env),
    ENTORNO_SITIO: entornoSitio(process.env),
    PLATAFORMA: plataforma(process.env),
  },
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Metadatos siempre en el <head> (título, descripción, Open Graph), no al final del <body>.
  // Google y WhatsApp ya los recibían así; esto lo extiende a todos los buscadores y vistas previas.
  // El costo es mínimo: los datos del producto salen de la caché del catálogo. (RNF-11)
  htmlLimitedBots: /.*/,
  experimental: {
    // Dos imágenes de hasta 5 MB más el resto del formulario. En el navegador se reducen antes
    // de enviarlas (Vercel limita el cuerpo de la petición a 4.5 MB y Netlify a 6 MB), pero el servidor no depende de eso.
    serverActions: { bodySizeLimit: "11mb" },
    proxyClientMaxBodySize: "11mb",
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
