# ADR-002 · Multi-tenant con base compartida y `tenantId` por fila

**Estado:** Aceptada · 2026-09-30 · Origen: `docs/TECNICO.md`

## Contexto
La plataforma sirve a muchas compraventas con datos que no deben mezclarse (RNF-05). Una base por tenant es costosa de operar y migrar para este tamaño.

## Decisión
Una sola base PostgreSQL con `tenantId` en cada fila de negocio. Una extensión de Prisma inyecta el `tenantId` en las consultas solo para los modelos de la lista blanca (`apps/api/src/prisma/extensions/scoped-models.ts`). Un modelo no registrado queda sin acceso: falla cerrado. Los modelos con plata se agregan además a `AUDITED_MODELS`.

## Consecuencias
- Todo modelo nuevo con `tenantId` debe registrarse en la lista blanca (regla de dominio 8).
- Los índices de consulta empiezan por `tenantId`.
- Hay que probar el aislamiento automáticamente por cada modelo de la lista blanca.
- Un tenant muy grande podría requerir base dedicada (plan Enterprise).
