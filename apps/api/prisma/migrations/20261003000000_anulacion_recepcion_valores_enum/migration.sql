-- Valores nuevos en enums existentes. Van en su propia migración porque
-- PostgreSQL no deja usar un valor de enum en la misma transacción que lo crea.
ALTER TYPE "Permission" ADD VALUE 'RECEPCION_ANULAR';
ALTER TYPE "OrigenMovimientoInventario" ADD VALUE 'ANULACION_RECEPCION';
