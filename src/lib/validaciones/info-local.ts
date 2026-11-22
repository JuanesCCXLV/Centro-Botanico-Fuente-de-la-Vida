import { z } from "zod";
import { leerFormulario, textoObligatorio } from "./comunes";

/** Hosts permitidos por red social: evita enlaces a otros sitios o "javascript:" (CS-05, CS-15). */
const REDES = {
  instagram: ["instagram.com", "www.instagram.com"],
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
} as const;

export type RedSocial = keyof typeof REDES;
export type RedesSociales = Partial<Record<RedSocial, string>>;

const enlaceRed = (red: RedSocial, nombre: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v) || null,
    z
      .string()
      .max(200, `${nombre}: enlace demasiado largo.`)
      .refine((v) => {
        try {
          const url = new URL(v);
          return url.protocol === "https:" && (REDES[red] as readonly string[]).includes(url.hostname);
        } catch {
          return false;
        }
      }, `${nombre}: usa un enlace https:// de ${REDES[red][0]}.`)
      .nullable(),
  );

const coordenada = (min: number, max: number, nombre: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v.replace(",", ".")) : null),
    z.number(`${nombre} debe ser un número.`).min(min, `${nombre} fuera de rango.`).max(max, `${nombre} fuera de rango.`).nullable(),
  );

export const esquemaInfoLocal = z
  .object({
    direccion: textoObligatorio(200, "La dirección"),
    // Uno por línea; se aceptan espacios, guiones, paréntesis y el prefijo +
    telefonos: z.preprocess(
      (v) =>
        typeof v === "string"
          ? v
              .split(/[\n,]/)
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      z
        .array(z.string().regex(/^\+?[\d\s()-]{7,20}$/, "Revisa los teléfonos: solo números, espacios, guiones o +."))
        .max(5, "Máximo 5 teléfonos."),
    ),
    // Formato internacional sin signos, como lo usa wa.me: 57 + número
    whatsapp: z.preprocess(
      (v) => (typeof v === "string" ? v.replace(/\D/g, "") : ""),
      z.string().regex(/^\d{10,15}$/, "El WhatsApp debe incluir el indicativo del país, por ejemplo 573001234567."),
    ),
    correo: z.preprocess(
      (v) => (typeof v === "string" ? v.trim().toLowerCase() : v) || null,
      z.email("El correo no es válido.").max(254).nullable(),
    ),
    horarios: textoObligatorio(500, "Los horarios"),
    latitud: coordenada(-90, 90, "La latitud"),
    longitud: coordenada(-180, 180, "La longitud"),
    instagram: enlaceRed("instagram", "Instagram"),
    facebook: enlaceRed("facebook", "Facebook"),
    tiktok: enlaceRed("tiktok", "TikTok"),
  })
  .refine((d) => (d.latitud === null) === (d.longitud === null), {
    message: "Escribe la latitud y la longitud, o deja ambas vacías.",
    path: ["latitud"],
  });

export type FormularioInfoLocal = z.infer<typeof esquemaInfoLocal>;

/** Forma en que se guarda (las redes van juntas en un JSON). */
export interface DatosInfoLocal {
  direccion: string;
  telefonos: string[];
  whatsapp: string;
  correo: string | null;
  horarios: string;
  latitud: number | null;
  longitud: number | null;
  redesSociales: RedesSociales;
}

export function leerDatosInfoLocal(formData: FormData) {
  const r = leerFormulario(esquemaInfoLocal, formData);
  if (!r.ok) return r;
  const { instagram, facebook, tiktok, ...resto } = r.datos;
  const redesSociales: RedesSociales = {};
  if (instagram) redesSociales.instagram = instagram;
  if (facebook) redesSociales.facebook = facebook;
  if (tiktok) redesSociales.tiktok = tiktok;
  return { ok: true as const, datos: { ...resto, redesSociales } satisfies DatosInfoLocal };
}
