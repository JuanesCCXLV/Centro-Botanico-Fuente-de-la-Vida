// Sin dependencias: lo usan tanto env.ts como next.config.ts.

type Fuente = Partial<Record<string, string | undefined>>;

/**
 * URL pública del sitio, sin "/" al final.
 * 1. SITE_URL si está definida (en producción: el dominio del cliente con https).
 * 2. En Vercel, la URL que Vercel asigna: la de producción del proyecto o la del despliegue de vista previa.
 * 3. En local, http://localhost:3000.
 */
export function resolverUrlSitio(fuente: Fuente): string {
  const explicita = fuente.SITE_URL?.trim();
  if (explicita) return explicita.replace(/\/+$/, "");

  const host =
    fuente.VERCEL_ENV === "production" && fuente.VERCEL_PROJECT_PRODUCTION_URL
      ? fuente.VERCEL_PROJECT_PRODUCTION_URL
      : fuente.VERCEL_URL;
  if (host) return `https://${host}`;

  return "http://localhost:3000";
}
