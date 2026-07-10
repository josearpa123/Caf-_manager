-- CreateEnum
CREATE TYPE "EstadoContratoVenta" AS ENUM ('VIGENTE', 'CUMPLIDO', 'CANCELADO');

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "contratoVentaId" TEXT;

-- CreateTable
CREATE TABLE "ContratoVenta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "compradorId" TEXT,
    "compradorNombre" TEXT NOT NULL,
    "tipoCafe" "TipoInventario" NOT NULL,
    "cantidadKgPactada" DECIMAL(10,2) NOT NULL,
    "cantidadKgEntregada" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "precioKg" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaLimite" DATE,
    "estado" "EstadoContratoVenta" NOT NULL DEFAULT 'VIGENTE',
    "observaciones" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoVenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContratoVenta_tenantId_estado_idx" ON "ContratoVenta"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "ContratoVenta_tenantId_puntoCompraId_idx" ON "ContratoVenta"("tenantId", "puntoCompraId");

-- CreateIndex
CREATE INDEX "ContratoVenta_compradorId_idx" ON "ContratoVenta"("compradorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoVenta_tenantId_codigo_key" ON "ContratoVenta"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Venta_contratoVentaId_idx" ON "Venta"("contratoVentaId");

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_contratoVentaId_fkey" FOREIGN KEY ("contratoVentaId") REFERENCES "ContratoVenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVenta" ADD CONSTRAINT "ContratoVenta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVenta" ADD CONSTRAINT "ContratoVenta_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVenta" ADD CONSTRAINT "ContratoVenta_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoVenta" ADD CONSTRAINT "ContratoVenta_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
