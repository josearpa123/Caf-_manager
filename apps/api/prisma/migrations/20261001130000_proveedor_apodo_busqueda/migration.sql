-- Extensión de trigramas (disponible en PostgreSQL estándar y en Neon).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "apodo" TEXT;

-- CreateIndex
CREATE INDEX "Proveedor_nombre_trgm_idx" ON "Proveedor" USING GIN ("nombre" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Proveedor_apodo_trgm_idx" ON "Proveedor" USING GIN ("apodo" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Proveedor_numeroIdentificacion_trgm_idx" ON "Proveedor" USING GIN ("numeroIdentificacion" gin_trgm_ops);

