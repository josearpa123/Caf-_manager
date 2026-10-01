# ADR-003 · Consecutivos con tabla de contadores y bloqueo de fila

**Estado:** Aceptada · 2026-09-30 · Origen: `docs/TECNICO.md` (hallazgo H1)

## Contexto
El código de recepción (`REC-2026-000123`) se genera con `count()` + 1. Dos recepciones simultáneas obtienen el mismo código y una falla con 500; además `count()` se degrada al crecer la tabla.

## Decisión
Tabla `Consecutivo` con llave primaria `(tenantId, tipo)` y campos `prefijo`, `anio`, `valorActual`. Se incrementa con `UPDATE … SET valorActual = valorActual + 1 RETURNING` dentro de la misma transacción que crea el registro.

## Consecuencias
- Sin códigos repetidos bajo concurrencia; el bloqueo de una fila dura milisegundos y no afecta a otros tenants.
- Si la transacción falla, el consecutivo no se consume.
- Se prueba con 100 recepciones concurrentes (sprint 0). Nunca usar `count() + 1` (regla de dominio 5).
