import { z } from "zod";

export type ErroresCampos = Partial<Record<string, string>>;

/** Texto opcional: recorta espacios y convierte "" en null. */
export const textoOpcional = (max: number, campo: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v) || null,
    z.string().max(max, `${campo}: máximo ${max} caracteres.`).nullable(),
  );

export const textoObligatorio = (max: number, campo: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, `${campo} es obligatorio.`).max(max, `${campo}: máximo ${max} caracteres.`),
  );

/** Casilla de verificación de un formulario HTML ("on" cuando está marcada). */
export const casilla = z.preprocess((v) => v === "on" || v === "true", z.boolean());

/** Primer mensaje de error por campo. */
export function erroresPorCampo(error: z.ZodError): ErroresCampos {
  const errores: ErroresCampos = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "general");
    errores[campo] ??= issue.message;
  }
  return errores;
}

/** Lee del FormData solo los campos del esquema y los valida. */
export function leerFormulario<T extends z.ZodObject>(
  esquema: T,
  formData: FormData,
): { ok: true; datos: z.infer<T> } | { ok: false; errores: ErroresCampos } {
  const entrada = Object.fromEntries(Object.keys(esquema.shape).map((c) => [c, formData.get(c)]));
  const r = esquema.safeParse(entrada);
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: erroresPorCampo(r.error) };
}
