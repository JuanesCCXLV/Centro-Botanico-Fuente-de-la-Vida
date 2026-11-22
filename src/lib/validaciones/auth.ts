import { z } from "zod";
import { LONGITUD_MIN_CLAVE } from "@/services/auth.service";

export const esquemaLogin = z.object({
  correo: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Sin reglas de composición aquí: solo límites para no procesar entradas absurdas con argon2
  clave: z.string().min(1).max(256),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;

// Política del Plan de Pruebas 5.4: mínimo 12 caracteres, sin reglas absurdas de composición
export const esquemaCambioClave = z
  .object({
    actual: z.string().min(1, "Escribe tu contraseña actual.").max(256),
    nueva: z
      .string()
      .min(LONGITUD_MIN_CLAVE, `La nueva contraseña debe tener al menos ${LONGITUD_MIN_CLAVE} caracteres.`)
      .max(256, "La nueva contraseña es demasiado larga."),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    message: "La confirmación no coincide con la nueva contraseña.",
    path: ["confirmacion"],
  })
  .refine((d) => d.nueva !== d.actual, {
    message: "La nueva contraseña debe ser distinta de la actual.",
    path: ["nueva"],
  });
