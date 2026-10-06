# ADR-010 · Anulación de recepciones: qué se revierte, qué la bloquea y cómo se marca

**Estado:** Aceptada · 2026-10-03 · Origen: `docs/TECNICO.md` (H4, RF-07, RF-08, CU-02). Desarrolla la decisión de [ADR-004](004-recepciones-inmutables.md).

## Contexto
ADR-004 dijo que corregir es anular y volver a registrar. Falta decidir los detalles que el código obliga a escoger: cómo se "revierte" un pago que no tiene estado, cómo saber que una recepción ya se fue en una trilla (la trilla no queda ligada a una recepción concreta) y qué pasa si dos personas anulan al mismo tiempo.

## Decisión
1. **Marca, no borrado.** `Recepcion.estado` pasa de `ACTIVA` a `ANULADA` con `anuladaAt`, `anuladaPorId` y `motivoAnulacion` (10 a 500 caracteres). Los campos de plata no se tocan.
2. **Inventario.** Se crea un `MovimientoInventario` de `SALIDA` por el mismo peso neto, con origen nuevo `ANULACION_RECEPCION`. El ledger conserva la entrada original.
3. **Pagos y conciliaciones.** No se borran ni se contraponen con montos negativos: se marcan con `anuladoAt`. El pago de la recepción y las conciliaciones de anticipo ligadas a ella (directas o por esos pagos) quedan anulados; el anticipo vuelve a tener saldo sin aplicar. El estado de cuenta, los saldos de anticipo y los reportes cuentan solo filas con `anuladoAt` nulo.
4. **Qué la bloquea (RF-08).**
   - Si la recepción está en un secado o en una venta (`ProcesoSecadoRecepcion`, `VentaLoteOrigen`): 409 con el código del proceso que hay que revertir primero.
   - La trilla y la mezcla de pasilla consumen el inventario del punto de compra en conjunto y no se ligan a una recepción. Para detectarlas se compara el stock disponible de ese tipo de café en el punto con el peso que aportó la recepción: si no alcanza, 409 diciendo que parte del café ya salió en un proceso posterior.
5. **Concurrencia e idempotencia.** Todo ocurre en una transacción que empieza con la reserva de la llave de idempotencia (ADR-007, alcance `RECEPCION_ANULAR`) y toma `SELECT … FOR UPDATE` sobre la fila de la recepción. Dos anulaciones simultáneas con llaves distintas se serializan: gana una y la otra recibe 409 "ya está anulada". Un reintento con la misma llave y el mismo motivo devuelve la recepción ya anulada.
6. **Permiso propio.** `RECEPCION_ANULAR`, separado de `RECEPCION_ELIMINAR`. La migración se lo da al rol Administrador del sistema de los negocios existentes; los nuevos lo reciben con todos los permisos.
7. **Las anuladas no se usan.** No admiten pagos, conciliaciones, secado, venta ni factura, y salen de los reportes y exportaciones.

## Consecuencias
- La nota de ajuste del documento soporte DIAN **no se encola todavía** (no hay cola hasta el Sprint 3): la respuesta trae `notaAjusteDianPendiente` cuando la recepción tenía factura emitida, para hacerla a mano mientras tanto.
- **Hoy no existe "revertir un secado" ni "anular una venta"** en el sistema; el mensaje de bloqueo nombra el proceso, pero quien administra no tiene una pantalla para deshacerlo. Es la siguiente deuda de este módulo.
- La verificación por stock tiene una ventana de carrera: una trilla o venta que se registre exactamente entre la lectura del stock y el commit de la anulación podría dejar el inventario en negativo. La trilla y la venta no toman el mismo candado. Es improbable (la anulación dura milisegundos) y queda anotado como riesgo.
- Marcar con `anuladoAt` obliga a que toda consulta nueva de pagos o conciliaciones filtre `anuladoAt: null`.
