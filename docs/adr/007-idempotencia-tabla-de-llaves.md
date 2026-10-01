# ADR-007 · Idempotencia con tabla genérica de llaves, reservada dentro de la transacción

**Estado:** Aceptada · 2026-10-01 · Origen: `docs/TECNICO.md` (hallazgo H7, CU-01 flujo 7a, regla de dominio 6)

## Contexto
Con mala señal el operador oprime "Guardar" dos veces o el cliente reintenta, y se crean dos recepciones (plata e inventario duplicados). La regla 6 exige lo mismo en pagos, anticipos y ventas.

## Decisión
Tabla `IdempotencyKey` con llave primaria `(tenantId, alcance, llave)` y campos `hashSolicitud`, `recursoId`, `expiraEn`. El plan original proponía una columna `Recepcion.idempotencyKey`; se cambió por una tabla genérica para no repetir la columna en cuatro módulos (decisión del usuario, 2026-10-01).

- El cliente envía el encabezado `Idempotency-Key` (8–128 caracteres `[A-Za-z0-9_-]`, típicamente un UUID). Es **opcional** en el servidor; sin él la operación se comporta como antes. La web debe enviarlo siempre.
- **Reintento con la misma llave y el mismo cuerpo** (huella SHA-256 del DTO con propiedades ordenadas): devuelve el documento ya creado, sin crear nada. **Con otro cuerpo: 409.**
- **La reserva es la primera sentencia de la transacción de negocio** (`INSERT … ON CONFLICT DO UPDATE … WHERE expiraEn <= now()`) y `recursoId` se completa en la misma transacción. Si otra petición con la misma llave está en curso, el `INSERT` espera hasta que esa haga COMMIT (entonces la segunda hace rollback y devuelve la primera) o ROLLBACK (entonces reserva). No hace falta estado "en proceso" ni tiempos de espera, y la llave y el documento se confirman juntos o ninguno; si la operación falla, la llave no queda reservada y el reintento corregido funciona.
- Vigencia de 24 h; una llave vencida se acepta como operación nueva (se reemplaza).
- Las consultas van con SQL explícito y `tenantId` del JWT (como `siguienteConsecutivo`); el modelo está en la lista blanca de tenant. No se audita: no mueve plata por sí mismo.
- Código: `apps/api/src/prisma/idempotencia.ts` (`ejecutarConLlave` es el envoltorio común). Alcances: `RECEPCION`, `PAGO`, `ANTICIPO`, `VENTA`; la llave es única por alcance, no global del tenant.

## Consecuencias
- Un solo mecanismo para recepción, pagos, anticipos y ventas. Los pagos y anticipos pasaron a crearse dentro de una transacción.
- Una carrera entre dos peticiones con la misma llave consume un consecutivo que queda como hueco (ya aceptado en ADR-003).
- Las filas vencidas se acumulan hasta que exista limpieza periódica: va a la cola BullMQ en el Sprint 3 (índice por `expiraEn` listo).
- Probado con PostgreSQL real: 10 peticiones simultáneas con la misma llave crean una sola recepción (`apps/api/test/idempotencia.int-spec.ts`).
