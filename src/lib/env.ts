import { z } from "zod";

const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  // URL pública del sitio (sin / al final), para enlaces canónicos, sitemap y redes sociales
  SITE_URL: z.url().default("http://localhost:3000"),
  // Opcionales: sin ellas, en desarrollo se usa el almacenamiento local de imágenes
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  console.error("Variables de entorno inválidas:", resultado.error.flatten().fieldErrors);
  throw new Error("Configuración de entorno inválida");
}

export const env = resultado.data;