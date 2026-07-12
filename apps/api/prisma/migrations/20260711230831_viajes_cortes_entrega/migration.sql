-- CreateEnum
CREATE TYPE "EstadoViaje" AS ENUM ('ABIERTO', 'CERRADO');

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "viajeId" TEXT;

-- CreateTable
CREATE TABLE "Viaje" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destino" TEXT,
    "placa" TEXT,
    "estado" "EstadoViaje" NOT NULL DEFAULT 'ABIERTO',
    "observaciones" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Viaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Viaje_tenantId_fecha_idx" ON "Viaje"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Viaje_tenantId_estado_idx" ON "Viaje"("tenantId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Viaje_tenantId_codigo_key" ON "Viaje"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Venta_viajeId_idx" ON "Venta"("viajeId");

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Viaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Viaje" ADD CONSTRAINT "Viaje_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
