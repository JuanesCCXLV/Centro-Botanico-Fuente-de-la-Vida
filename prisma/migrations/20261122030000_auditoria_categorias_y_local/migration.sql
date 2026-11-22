-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoEvento" ADD VALUE 'CATEGORIA_CREADA';
ALTER TYPE "TipoEvento" ADD VALUE 'CATEGORIA_EDITADA';
ALTER TYPE "TipoEvento" ADD VALUE 'CATEGORIA_VISIBILIDAD';
ALTER TYPE "TipoEvento" ADD VALUE 'CATEGORIA_ELIMINADA';
ALTER TYPE "TipoEvento" ADD VALUE 'INFO_LOCAL_EDITADA';
