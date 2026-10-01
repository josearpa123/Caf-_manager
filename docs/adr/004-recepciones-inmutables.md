# ADR-004 · Recepciones inmutables: corregir es anular y volver a registrar

**Estado:** Aceptada · 2026-09-30 · Origen: `docs/TECNICO.md` (hallazgo H4, CU-02)

## Contexto
Hoy los errores de digitación se quedan para siempre o se borran sin rastro. La recepción mueve plata, inventario y obligaciones tributarias.

## Decisión
Una recepción nunca se edita en sus campos de plata ni se borra. Se agrega `estado` (`ACTIVA`/`ANULADA`) y, al anular, motivo (mín. 10 caracteres), quién y cuándo, más un movimiento de inventario de salida compensatorio y reversión de pagos y conciliaciones. No se puede anular si la recepción ya está en un secado, trilla o venta. `precioKg`, retención y neto a pagar se copian e inmutan al guardar.

## Consecuencias
- Trazabilidad completa; el inventario sigue siendo un ledger (`MovimientoInventario`).
- Los reportes deben filtrar `estado = ACTIVA`.
- Si ya hay documento soporte emitido, se encola una nota de ajuste (fase 2).
