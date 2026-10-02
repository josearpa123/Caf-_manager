# CLAUDE.md — Coffee Manager

Instrucciones permanentes para Claude Code en este repositorio. Léelas completas antes de cualquier tarea.

## Qué es el proyecto

SaaS multi-tenant para compraventas de café pergamino en Colombia: recepción con calidad (humedad, factor, defectos), bodega (secado, trilla), ventas y contratos, pagos, anticipos, préstamos, reportes.

- Monorepo pnpm + Turborepo: `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Next.js 14), `packages/` (tipos y esquemas compartidos).
- Comandos: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm db:migrate`, `pnpm db:generate`, `pnpm db:seed`. En la API: `pnpm --filter api test:cov`, `pnpm --filter api test:e2e`.

## Fuente de verdad del plan

- `docs/TECNICO.md` — documentación técnica y plan de desarrollo (requisitos RF/RNF, casos de uso CU-01..03, modelo de datos, arquitectura, escalabilidad, buenas prácticas, sprints 0–4, hallazgos H1–H8).
- `docs/PROGRESO.md` — bitácora de avance.
- `docs/adr/` — decisiones de arquitectura (ADR-001 a ADR-006 listadas en TECNICO.md).
- `docs/diagramas/` — diagramas Mermaid (MER completo y secuencia de recepción rápida).

Antes de empezar cualquier tarea, lee la sección de `docs/TECNICO.md` que corresponde al sprint y a los requisitos que vas a tocar. Si una instrucción mía contradice ese documento, pregúntame antes de seguir.

## Reglas de dominio que no se rompen

1. Montos siempre `Decimal`, nunca `number`/`float` para plata o pesos en kg.
2. Una recepción nunca se edita en sus campos de plata ni se borra: corregir = anular (estado `ANULADA`, motivo, quién, cuándo, movimiento de inventario compensatorio) + registrar una nueva.
3. `precioKg`, retención y neto a pagar se copian e inmutan al guardar la recepción.
4. Inventario = ledger de `MovimientoInventario`; nunca un saldo que se sobrescribe.
5. Consecutivos con la tabla `Consecutivo` y `UPDATE … RETURNING` dentro de la transacción; nunca `count() + 1`.
6. Toda escritura de plata (recepción, pago, anticipo, venta) acepta llave de idempotencia y no duplica si llega dos veces.
7. Parámetros tributarios (UVT, umbral, tarifa) se leen de `ParametroTributario` por fecha; nunca valores fijos en el código.
8. Todo modelo nuevo con `tenantId` se agrega a la lista blanca de `apps/api/src/prisma/extensions/scoped-models.ts` y, si maneja plata, a `AUDITED_MODELS` en `audit-log.extension.ts`.
9. Lo lento o externo (PDF, WhatsApp, DIAN) va a la cola BullMQ, nunca dentro de la petición HTTP.
10. Toda consulta de listados filtra por un índice que empieza en `tenantId` y pagina por cursor.

## Cómo trabajar

- Una tarea = una rama `feat/…` o `fix/…` = un PR pequeño. Commits convencionales (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`).
- Pruebas primero en la lógica de cálculo: factor, tramo de precio, peso neto, valor total, retención, saldos. Meta: ≥ 90% de cobertura en `calidad`, `recepcion`, `pagos`.
- Cada regla de negocio nueva lleva prueba de integración con PostgreSQL real.
- Migraciones con el patrón expandir y contraer: nunca renombrar o borrar una columna en un solo paso.
- Antes de dar una tarea por terminada: `pnpm lint`, `pnpm test` y `pnpm build` en verde. Si algo falla, arréglalo; no lo dejes para después.
- No agregues dependencias nuevas sin decirme cuál y por qué.
- No toques `.env` ni secretos; usa `.env.example` y documenta las variables nuevas.

## Actualización obligatoria de la documentación

Al terminar cada tarea (antes del commit final del PR):

1. **`docs/PROGRESO.md`**: agrega una entrada arriba con fecha, sprint, qué se hizo, qué RF/RNF/H cubre, pruebas agregadas, pendientes y riesgos encontrados.
2. **`docs/TECNICO.md`**: actualiza solo lo que cambió de verdad:
   - Marca el estado en la tabla del sprint (pendiente / en curso / hecho) y en los hallazgos H1–H8 que se cierren.
   - Si cambió el modelo de datos, actualiza el diccionario de datos y regenera el MER de `docs/diagramas/mer.md` desde `schema.prisma`.
   - Si cambió un flujo, actualiza el caso de uso y el diagrama de secuencia.
   - Si tomaste una decisión de arquitectura nueva, crea un ADR en `docs/adr/NNN-titulo.md` (contexto, decisión, consecuencias) y enlázalo.
   - Si algo del plan resultó distinto a lo escrito, corrige el texto y explica el porqué en PROGRESO.md. No dejes el documento diciendo algo que el código ya no hace.
3. **Manual de usuario** (`apps/web/content/manual.md`, se ve en el sistema en Administración → Ayuda): si el cambio modifica lo que el usuario ve o hace (pantallas, opciones de Configuración, mensajes de error, reglas como la retención), actualízalo en el mismo PR, con palabras simples y sin tablas. Pregunta antes de agregar contenido que no puedas verificar contra el sistema.
4. Al final de tu respuesta, dame un resumen corto con: archivos tocados, requisitos cubiertos, cómo probarlo a mano y qué sigue.

## Prioridad actual

Seguir el orden de sprints de `docs/TECNICO.md`: Sprint 0 (consecutivos atómicos, pruebas de dominio, CI), Sprint 1 (recepción rápida ≤ 45 s, idempotencia, búsqueda con `pg_trgm`), Sprint 2 (recibo térmico, anulación, retención, pago en el mismo paso), Sprint 3 (Hostinger KVM 2 + Coolify, backups, BullMQ, seguridad), Sprint 4 (importación desde Excel, onboarding).
