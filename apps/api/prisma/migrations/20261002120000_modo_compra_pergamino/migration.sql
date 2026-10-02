-- CreateEnum
CREATE TYPE "ModoCompraPergamino" AS ENUM ('CALIDAD', 'PRECIO_DIRECTO');

-- AlterTable
ALTER TABLE "ConfiguracionTenant" ADD COLUMN     "modoCompraPergamino" "ModoCompraPergamino" NOT NULL DEFAULT 'CALIDAD';

