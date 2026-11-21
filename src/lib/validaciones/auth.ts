import { z } from "zod";

export const esquemaLogin = z.object({
  correo: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Sin reglas de composición aquí: solo límites para no procesar entradas absurdas con argon2
  clave: z.string().min(1).max(256),
});

export type DatosLogin = z.infer<typeof esquemaLogin>;
