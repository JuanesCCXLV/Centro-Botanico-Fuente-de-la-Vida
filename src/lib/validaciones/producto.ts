import { z } from "zod";
import { casilla, leerFormulario, textoObligatorio, textoOpcional } from "./comunes";

export type { ErroresCampos } from "./comunes";

export const PRECIO_MAX_COP = 100_000_000;

// Acepta "15000", "15.000" y "$ 15.000". Sin decimales: el precio se guarda como entero en COP.
const precio = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s$.]/g, "") : ""),
  z
    .string()
    .regex(/^\d+$/, "El precio debe ser un número entero en pesos, sin decimales.")
    .transform(Number)
    .pipe(z.number().int().max(PRECIO_MAX_COP, "El precio es demasiado alto.")),
);

export const esquemaProducto = z.object({
  nombre: textoObligatorio(120, "El nombre"),
  descripcion: textoObligatorio(5000, "La descripción"),
  presentacion: textoOpcional(120, "Presentación"),
  usoSugerido: textoOpcional(2000, "Uso sugerido"),
  precioCop: precio,
  categoriaId: z.coerce.number().int("Elige una categoría.").positive("Elige una categoría."),
  registroSanitario: textoOpcional(60, "Registro sanitario"),
  visible: casilla,
  destacado: casilla,
});

export type DatosProducto = z.infer<typeof esquemaProducto>;

export const leerDatosProducto = (formData: FormData) => leerFormulario(esquemaProducto, formData);
