import { obtenerImageStorage } from "@/lib/almacenamiento";
import { categoriaRepository } from "@/repositories/categoria.repository";
import { eventoRepository } from "@/repositories/evento.repository";
import { productoRepository } from "@/repositories/producto.repository";
import { crearProductoService } from "@/services/producto.service";
import type { ImageStorage } from "@/lib/almacenamiento";

// El almacenamiento se resuelve al primer uso, no al importar (así `next build` no exige Cloudinary)
const storagePerezoso: ImageStorage = {
  subir: (...args) => obtenerImageStorage().subir(...args),
  eliminar: (...args) => obtenerImageStorage().eliminar(...args),
};

export const productoService = crearProductoService({
  productos: productoRepository,
  categorias: categoriaRepository,
  imagenes: storagePerezoso,
  eventos: eventoRepository,
});
