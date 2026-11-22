-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'LOGIN_LIMITADO', 'LOGOUT', 'CAMBIO_CONTRASENA');

-- CreateTable
CREATE TABLE "Evento" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "usuarioId" TEXT,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evento_tipo_ip_creadoEn_idx" ON "Evento"("tipo", "ip", "creadoEn");

-- CreateIndex
CREATE INDEX "Evento_usuarioId_creadoEn_idx" ON "Evento"("usuarioId", "creadoEn");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
