import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FormatoImagen, ImageStorage, ImagenSubida } from "./image-storage";

const SEGMENTO_SEGURO = /^[a-z0-9-]+$/;

/**
 * Solo para desarrollo: guarda en public/uploads. En Vercel el disco es de solo lectura,
 * por eso en producción se exige Cloudinary.
 * El nombre del archivo lo genera el servidor (UUID): nunca se usa el nombre que envía el usuario (CS-12).
 */
export function crearLocalStorage(dirPublico = path.join(process.cwd(), "public")): ImageStorage {
  const raiz = path.join(dirPublico, "uploads");

  const rutaSegura = (idPublico: string) => {
    const destino = path.resolve(raiz, idPublico);
    if (!destino.startsWith(raiz + path.sep)) throw new Error("Ruta de imagen inválida");
    return destino;
  };

  return {
    async subir(bytes: Uint8Array, formato: FormatoImagen, carpeta: string): Promise<ImagenSubida> {
      if (!SEGMENTO_SEGURO.test(carpeta)) throw new Error("Nombre de carpeta inválido");
      const idPublico = `${carpeta}/${randomUUID()}.${formato}`;
      const destino = rutaSegura(idPublico);
      await mkdir(path.dirname(destino), { recursive: true });
      await writeFile(destino, bytes);
      return { url: `/uploads/${idPublico}`, idPublico };
    },

    async eliminar(idPublico: string): Promise<void> {
      await rm(rutaSegura(idPublico), { force: true });
    },
  };
}
