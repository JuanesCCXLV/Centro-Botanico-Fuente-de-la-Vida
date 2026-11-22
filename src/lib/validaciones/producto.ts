import { z } from "zod";

export const PRECIO_MAX_COP = 100_000_000;

/** Texto opcional: recorta espacios y convierte "" en null. */
const textoOpcional = (max: number, campo: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v) || null,
    z.string().max(max, `${campo}: máximo ${max} caracteres.`).nullable(),
  );

const textoObligatorio = (max: number, campo: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, `${campo} es obligatorio.`).max(max, `${campo}: máximo ${max} caracteres.`),
  );

// Acepta "15000", "15.000" y "$ 15.000". Sin decimales: el precio se guarda como entero en COP.
const precio = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s$.]/g, "") : ""),
  z
    .string()
    .regex(/^\d+$/, "El precio debe ser un número entero en pesos, sin decimales.")
    .transform(Number)
    .pipe(z.number().int().max(PRECIO_MAX_COP, "El precio es demasiado alto.")),
);

const casilla = z.preprocess((v) => v === "on" || v === "true", z.boolean());

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
export type ErroresCampos = Partial<Record<string, string>>;

const CAMPOS = Object.keys(esquemaProducto.shape) as (keyof DatosProducto)[];

export function leerDatosProducto(
  formData: FormData,
): { ok: true; datos: DatosProducto } | { ok: false; errores: ErroresCampos } {
  const entrada = Object.fromEntries(CAMPOS.map((c) => [c, formData.get(c)]));
  const r = esquemaProducto.safeParse(entrada);
  if (r.success) return { ok: true, datos: r.data };

  const errores: ErroresCampos = {};
  for (const issue of r.error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message;
  }
  return { ok: false, errores };
}
