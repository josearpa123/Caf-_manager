-- CreateEnum
CREATE TYPE "ConceptoTributario" AS ENUM ('RETENCION_COMPRA_CAFE');

-- AlterTable
ALTER TABLE "ConfiguracionTenant" ADD COLUMN     "esAgenteRetencion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Recepcion" ADD COLUMN     "baseRetencion" DECIMAL(14,2),
ADD COLUMN     "netoPagar" DECIMAL(14,2),
ADD COLUMN     "tarifaRetencion" DECIMAL(7,6),
ADD COLUMN     "valorRetencion" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ParametroTributario" (
    "id" TEXT NOT NULL,
    "concepto" "ConceptoTributario" NOT NULL,
    "vigenteDesde" DATE NOT NULL,
    "valorUvt" DECIMAL(12,2) NOT NULL,
    "umbralUvt" DECIMAL(8,2) NOT NULL,
    "tarifa" DECIMAL(7,6) NOT NULL,
    "norma" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParametroTributario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParametroTributario_concepto_vigenteDesde_key" ON "ParametroTributario"("concepto", "vigenteDesde");


-- Recepciones anteriores: no se retuvo nada, el neto a pagar es el valor total.
UPDATE "Recepcion" SET "netoPagar" = "valorTotal" WHERE "netoPagar" IS NULL;

-- Valores verificados el 2026-10-01 con dos fuentes independientes:
--  · UVT 2026 = $52.374 (Resolución DIAN 000238 del 15-dic-2025).
--  · Compras de café pergamino o cereza: 0,5 % desde 70 UVT (Decreto 1625 de 2016;
--    sin cambios con el Decreto 572 de 2025, vigente desde el 1-jul-2026).
-- Cargar una fila nueva cada enero con la UVT del año (la recepción usa la fila
-- más reciente con vigenteDesde <= su fecha).
INSERT INTO "ParametroTributario" ("id", "concepto", "vigenteDesde", "valorUvt", "umbralUvt", "tarifa", "norma")
VALUES (
  gen_random_uuid()::text,
  'RETENCION_COMPRA_CAFE',
  DATE '2026-01-01',
  52374,
  70,
  0.005,
  'UVT: Resolución DIAN 000238 de 2025. Tarifa y base mínima: Decreto 1625 de 2016, compras de café pergamino o cereza.'
);
