// Validación pura (sin leer process.env al importar): la usan env.ts y las pruebas.
import { z } from "zod";
import { resolverUrlSitio } from "./url-sitio";

const esquema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // "production" | "preview" | "development" cuando corre en Vercel; vacío fuera de Vercel
    VERCEL_ENV: z.string().optional(),
    // Conexión de la aplicación. En Neon: la cadena con "-pooler" en el host
    DATABASE_URL: z.string().min(1),
    // URL pública del sitio (sin / al final), para enlaces canónicos, sitemap y redes sociales
    SITE_URL: z.url(),
    // Opcionales en desarrollo (se usa almacenamiento local); obligatorias en producción
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    // En el sitio publicado, una configuración incompleta debe frenar el despliegue, no fallar con clientes
    if (e.VERCEL_ENV !== "production") return;
    if (!e.SITE_URL.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["SITE_URL"], message: "En producción debe empezar con https://" });
    }
    for (const clave of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const) {
      if (!e[clave]) ctx.addIssue({ code: "custom", path: [clave], message: "Obligatoria en producción" });
    }
  });

export type Entorno = z.infer<typeof esquema>;

/** Valida las variables de entorno; lanza un error que dice cuáles faltan o están mal. */
export function validarEntorno(fuente: Partial<Record<string, string | undefined>>): Entorno {
  const resultado = esquema.safeParse({ ...fuente, SITE_URL: resolverUrlSitio(fuente) });
  if (!resultado.success) {
    const detalle = resultado.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuración de entorno inválida → ${detalle}`);
  }
  return resultado.data;
}

