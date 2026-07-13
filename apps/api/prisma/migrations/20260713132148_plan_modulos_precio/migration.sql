-- CreateEnum
CREATE TYPE "Modulo" AS ENUM ('PROVEEDORES', 'RECEPCION', 'BODEGA', 'VENTAS', 'CORTES', 'PAGOS', 'PRESTAMOS', 'FACTURACION', 'REPORTES');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "modulos" "Modulo"[],
ADD COLUMN     "precioMensual" INTEGER;

-- Los planes que ya existen se vendieron sin distinción de módulos: se les
-- asignan TODOS para que ningún tenant activo pierda acceso con este cambio.
-- A partir de aquí, la plataforma decide módulo por módulo al crear/editar.
UPDATE "Plan" SET "modulos" = ARRAY[
  'PROVEEDORES', 'RECEPCION', 'BODEGA', 'VENTAS', 'CORTES',
  'PAGOS', 'PRESTAMOS', 'FACTURACION', 'REPORTES'
]::"Modulo"[];
