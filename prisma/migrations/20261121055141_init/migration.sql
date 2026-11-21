-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "TipoImagen" AS ENUM ('FRONTAL', 'POSTERIOR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'ADMIN',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "presentacion" TEXT,
    "precioCop" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "registroSanitario" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagenProducto" (
    "id" SERIAL NOT NULL,
    "productoId" INTEGER NOT NULL,
    "tipo" "TipoImagen" NOT NULL,
    "url" TEXT NOT NULL,
    "textoAlternativo" TEXT,

    CONSTRAINT "ImagenProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoLocal" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "telefonos" TEXT[],
    "whatsapp" TEXT NOT NULL,
    "correo" TEXT,
    "horarios" TEXT NOT NULL,
    "redesSociales" JSONB,

    CONSTRAINT "InfoLocal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_slug_key" ON "Producto"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ImagenProducto_productoId_tipo_key" ON "ImagenProducto"("productoId", "tipo");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagenProducto" ADD CONSTRAINT "ImagenProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
