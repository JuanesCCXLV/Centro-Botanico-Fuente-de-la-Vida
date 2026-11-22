// Patrón Adapter: el resto del código depende solo de esta interfaz, nunca de Cloudinary.
// Cambiar de proveedor = escribir otra implementación, sin tocar servicios ni páginas.

export type FormatoImagen = "jpg" | "png" | "webp";

export interface ImagenSubida {
  url: string;
  /** Identificador para poder borrar el archivo después. */
  idPublico: string;
}

export interface ImageStorage {
  subir(bytes: Uint8Array, formato: FormatoImagen, carpeta: string): Promise<ImagenSubida>;
  eliminar(idPublico: string): Promise<void>;
}
