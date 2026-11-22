-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "usoSugerido" TEXT;

-- AlterTable
-- La tabla aún no tiene filas (la semilla no crea imágenes), por eso la columna puede ser obligatoria sin valor por defecto.
ALTER TABLE "ImagenProducto" ADD COLUMN     "idPublico" TEXT NOT NULL;
