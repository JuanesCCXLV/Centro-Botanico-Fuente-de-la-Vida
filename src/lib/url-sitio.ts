// Sin dependencias: lo usan tanto env.ts como next.config.ts.
//
// El sitio puede publicarse en Vercel o en Netlify. Cada plataforma expone variables distintas:
// - Vercel: VERCEL=1, VERCEL_ENV (production | preview), VERCEL_URL, VERCEL_PROJECT_PRODUCTION_URL.
//   Existen en el build y en tiempo de ejecución.
// - Netlify: NETLIFY=true, CONTEXT (production | deploy-preview | branch-deploy), URL, DEPLOY_PRIME_URL.
//   Solo existen en el build; por eso next.config.ts calcula estos valores al compilar
//   y los deja fijos en el código (opción `env`).

type Fuente = Partial<Record<string, string | undefined>>;

export type Plataforma = "vercel" | "netlify" | "local";
export type EntornoSitio = "produccion" | "vista-previa" | "local";

const PLATAFORMAS: readonly Plataforma[] = ["vercel", "netlify", "local"];
const ENTORNOS: readonly EntornoSitio[] = ["produccion", "vista-previa", "local"];

/** Dónde corre el sitio. PLATAFORMA (fijada en el build) tiene prioridad. */
export function plataforma(fuente: Fuente): Plataforma {
  const fijada = fuente.PLATAFORMA as Plataforma | undefined;
  if (fijada && PLATAFORMAS.includes(fijada)) return fijada;
  if (fuente.VERCEL) return "vercel";
  if (fuente.NETLIFY === "true") return "netlify";
  return "local";
}

/** Si es el sitio publicado, una vista previa o el equipo del desarrollador. ENTORNO_SITIO (fijado en el build) tiene prioridad. */
export function entornoSitio(fuente: Fuente): EntornoSitio {
  const fijado = fuente.ENTORNO_SITIO as EntornoSitio | undefined;
  if (fijado && ENTORNOS.includes(fijado)) return fijado;
  if (fuente.VERCEL_ENV === "production" || fuente.CONTEXT === "production") return "produccion";
  if (fuente.VERCEL_ENV === "preview" || fuente.CONTEXT === "deploy-preview" || fuente.CONTEXT === "branch-deploy") {
    return "vista-previa";
  }
  return "local";
}

/**
 * URL pública del sitio, sin "/" al final.
 * 1. SITE_URL si está definida (en producción: el dominio del cliente con https).
 * 2. La URL que asigna la plataforma: la de producción del proyecto o la de la vista previa.
 * 3. En local, http://localhost:3000.
 */
export function resolverUrlSitio(fuente: Fuente): string {
  const sinBarra = (url: string) => url.trim().replace(/\/+$/, "");

  const explicita = fuente.SITE_URL?.trim();
  if (explicita) return sinBarra(explicita);

  const entorno = entornoSitio(fuente);

  if (fuente.VERCEL_ENV) {
    const host =
      entorno === "produccion" && fuente.VERCEL_PROJECT_PRODUCTION_URL ? fuente.VERCEL_PROJECT_PRODUCTION_URL : fuente.VERCEL_URL;
    if (host) return `https://${host}`;
  }

  if (fuente.CONTEXT) {
    // En Netlify estas URL ya traen https://
    const url = entorno === "produccion" ? fuente.URL : fuente.DEPLOY_PRIME_URL;
    if (url) return sinBarra(url);
  }

  return "http://localhost:3000";
}
