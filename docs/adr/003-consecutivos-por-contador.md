# ADR-003 · Consecutivos con tabla de contadores y bloqueo de fila

**Estado:** Aceptada · 2026-09-30 · Origen: `docs/TECNICO.md` (hallazgo H1)

## Contexto
El código de recepción (`REC-2026-000123`) se genera con `count()` + 1. Dos recepciones simultáneas obtienen el mismo código y una falla con 500; además `count()` se degrada al crecer la tabla.

## Decisión
Tabla `Consecutivo` con llave primaria `(tenantId, tipo, anio)` y campos `prefijo`, `valorActual`. Se incrementa con un único `INSERT … ON CONFLICT DO UPDATE SET valorActual = valorActual + 1 RETURNING valorActual` (`siguienteConsecutivo`, `apps/api/src/prisma/consecutivo.ts`). La migración siembra cada contador con el mayor consecutivo ya emitido.

### Ajustes respecto al plan original (2026-09-30)
- **El año forma parte de la llave** (el plan decía `(tenantId, tipo)` con `anio` como campo). Con una sola fila por tipo, registrar un documento con fecha de otro año (ej. `viajes` acepta fecha) reiniciaría el contador y repetiría códigos.
- **Se asigna antes de abrir la transacción de negocio, no dentro.** La auditoría (`audit-log.extension.ts`) escribe con otra conexión; si el candado de la fila se retuviera hasta el COMMIT, N peticiones simultáneas del mismo tenant ocuparían las N conexiones del pool esperándolo y se bloquearían. Consecuencia aceptada: si la transacción falla después, el número queda sin usar (hueco), como en las secuencias de PostgreSQL. Nunca se repite.

## Consecuencias
- Sin códigos repetidos bajo concurrencia; el bloqueo de una fila dura milisegundos y no afecta a otros tenants.
- Pueden existir huecos en la numeración tras fallos; no hay duplicados.
- Se prueba con PostgreSQL real (`apps/api/test/consecutivos.int-spec.ts`): 100 llamadas concurrentes y 100 recepciones con 10 simultáneas. Nunca usar `count() + 1` (regla de dominio 5).
- Pendiente aparte: la auditoría con otra conexión (no transaccional) limita la concurrencia segura a ~mitad del pool de conexiones.
