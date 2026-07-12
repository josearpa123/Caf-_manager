-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('VIGENTE', 'PAGADO', 'CANCELADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Permission" ADD VALUE 'PRESTAMOS_VER';
ALTER TYPE "Permission" ADD VALUE 'PRESTAMOS_CREAR';
ALTER TYPE "Permission" ADD VALUE 'PRESTAMOS_EDITAR';

-- CreateTable
CREATE TABLE "Prestamo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'VIGENTE',
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbonoPrestamo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prestamoId" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonoPrestamo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prestamo_tenantId_proveedorId_idx" ON "Prestamo"("tenantId", "proveedorId");

-- CreateIndex
CREATE INDEX "Prestamo_tenantId_fecha_idx" ON "Prestamo"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Prestamo_tenantId_estado_idx" ON "Prestamo"("tenantId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Prestamo_tenantId_codigo_key" ON "Prestamo"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "AbonoPrestamo_tenantId_prestamoId_idx" ON "AbonoPrestamo"("tenantId", "prestamoId");

-- CreateIndex
CREATE INDEX "AbonoPrestamo_tenantId_fecha_idx" ON "AbonoPrestamo"("tenantId", "fecha");

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoPrestamo" ADD CONSTRAINT "AbonoPrestamo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoPrestamo" ADD CONSTRAINT "AbonoPrestamo_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "Prestamo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbonoPrestamo" ADD CONSTRAINT "AbonoPrestamo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
