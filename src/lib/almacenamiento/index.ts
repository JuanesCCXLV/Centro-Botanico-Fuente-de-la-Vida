import { env } from "@/lib/env";
import { crearCloudinaryStorage } from "./cloudinary-storage";
import type { ImageStorage } from "./image-storage";
import { crearLocalStorage } from "./local-storage";

export type { FormatoImagen, ImageStorage, ImagenSubida } from "./image-storage";

let instancia: ImageStorage | undefined;

/** Elige la implementación según la configuración. Se crea al primer uso, no al importar. */
export function obtenerImageStorage(): ImageStorage {
  if (instancia) return instancia;

  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;

  if (cloudName && apiKey && apiSecret) {
    instancia = crearCloudinaryStorage({ cloudName, apiKey, apiSecret });
  } else if (env.NODE_ENV !== "production") {
    instancia = crearLocalStorage();
  } else {
    throw new Error("Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET en producción");
  }
  return instancia;
}
