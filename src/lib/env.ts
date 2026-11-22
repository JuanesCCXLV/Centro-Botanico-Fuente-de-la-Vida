import { z } from "zod";

const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_WHATSAPP: z.string().regex(/^\d{10,15}$/).optional(),
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