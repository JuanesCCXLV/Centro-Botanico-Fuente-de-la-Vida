import type { FormatoImagen } from "@/lib/almacenamiento/image-storage";

export const TAMANO_MAX_IMAGEN = 5 * 1024 * 1024; // 5 MB (CS-12)

const TIPOS_MIME: Record<string, FormatoImagen> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ResultadoValidacionImagen =
  | { ok: true; formato: FormatoImagen }
  | { ok: false; error: string };

/**
 * Detecta el formato real por los primeros bytes del archivo ("número mágico").
 * No se confía en la extensión ni en el tipo MIME que envía el navegador.
 */
export function detectarFormato(bytes: Uint8Array): FormatoImagen | null {
  const empieza = (firma: number[], desde = 0) => firma.every((b, i) => bytes[desde + i] === b);
  if (empieza([0xff, 0xd8, 0xff])) return "jpg";
  if (empieza([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // RIFF....WEBP
  if (empieza([0x52, 0x49, 0x46, 0x46]) && empieza([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export function validarImagen(bytes: Uint8Array, tipoMime: string): ResultadoValidacionImagen {
  if (bytes.length === 0) return { ok: false, error: "El archivo está vacío." };
  if (bytes.length > TAMANO_MAX_IMAGEN) return { ok: false, error: "La imagen supera el máximo de 5 MB." };

  const declarado = TIPOS_MIME[tipoMime];
  if (!declarado) return { ok: false, error: "Solo se permiten imágenes JPG, PNG o WebP." };

  const real = detectarFormato(bytes);
  if (!real || real !== declarado) {
    return { ok: false, error: "El contenido del archivo no corresponde a una imagen JPG, PNG o WebP." };
  }
  return { ok: true, formato: real };
}
