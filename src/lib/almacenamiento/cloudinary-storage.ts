import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import type { FormatoImagen, ImageStorage, ImagenSubida } from "./image-storage";

export function crearCloudinaryStorage(config: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  carpetaRaiz?: string;
}): ImageStorage {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  const raiz = config.carpetaRaiz ?? "centro-botanico";

  return {
    subir(bytes: Uint8Array, formato: FormatoImagen, carpeta: string): Promise<ImagenSubida> {
      return new Promise((resolve, reject) => {
        const flujo = cloudinary.uploader.upload_stream(
          {
            folder: `${raiz}/${carpeta}`,
            resource_type: "image",
            format: formato,
            allowed_formats: ["jpg", "png", "webp"],
            // Limita el tamaño guardado: optimización automática para RNF-09
            transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto" }],
          },
          (error, resultado?: UploadApiResponse) => {
            if (error || !resultado) return reject(error ?? new Error("Cloudinary no devolvió resultado"));
            resolve({ url: resultado.secure_url, idPublico: resultado.public_id });
          },
        );
        flujo.end(Buffer.from(bytes));
      });
    },

    async eliminar(idPublico: string): Promise<void> {
      await cloudinary.uploader.destroy(idPublico, { resource_type: "image", invalidate: true });
    },
  };
}
