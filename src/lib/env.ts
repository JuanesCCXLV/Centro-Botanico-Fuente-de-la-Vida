import { validarEntorno } from "./env-esquema";

export type { Entorno } from "./env-esquema";

export const env = validarEntorno({
  ...process.env,
  // Escritas una por una para que Next las reemplace por los valores fijados al compilar (next.config.ts, opción env).
  // Con solo `...process.env` se perderían en Netlify, donde las variables de la plataforma no existen al atender visitas.
  SITE_URL: process.env.SITE_URL,
  ENTORNO_SITIO: process.env.ENTORNO_SITIO,
});
