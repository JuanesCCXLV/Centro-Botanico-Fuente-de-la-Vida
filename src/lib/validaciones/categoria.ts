import { z } from "zod";
import { casilla, leerFormulario, textoObligatorio, textoOpcional } from "./comunes";

export const esquemaCategoria = z.object({
  nombre: textoObligatorio(60, "El nombre"),
  descripcion: textoOpcional(500, "Descripción"),
  // Posición en el menú del catálogo: menor = primero. Vacío = 0.
  orden: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : 0),
    z.number("El orden debe ser un número.").int("El orden debe ser un número entero.").min(0, "El orden no puede ser negativo.").max(999, "El orden máximo es 999."),
  ),
  visible: casilla,
});

export type DatosCategoria = z.infer<typeof esquemaCategoria>;

export const leerDatosCategoria = (formData: FormData) => leerFormulario(esquemaCategoria, formData);
