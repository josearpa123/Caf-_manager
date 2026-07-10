# Bitácora de Avance del Proyecto

> Este archivo se actualiza al final de cada sesión de trabajo relevante. Es lo primero que hay que leer al retomar el proyecto (junto con `docs/requerimientos.md` para decisiones de diseño ya tomadas).

**Última actualización:** 2026-07-09

## Fase actual (según cronograma en `docs/doc.md` §7.2)

**FASE 2: Desarrollo del MVP — Sprint 3-4**

Terminado: autenticación/usuarios, Proveedores, Recepción (con tabla de precios y catálogo de defectos), Bodega (inventario, secado, trilla, destino de pasilla), fix de bugs estructurales que bloqueaban TODO módulo tenant-scoped.
Siguiente: **Pagos** (pagos a proveedores, anticipos, cuentas por pagar) — es lo que falta para cerrar el ciclo compra→bodega→pago; después **Ventas** para poder calcular rentabilidad por lote.

## Fase 1 — Planificación y Diseño: COMPLETA

- Documento de negocio (`docs/doc.md`) y decisiones de arquitectura (`docs/requerimientos.md`) cerrados.
- Schema de Prisma completo (`apps/api/prisma/schema.prisma`, 885 líneas).
- Migración inicial aplicada: `apps/api/prisma/migrations/20260709213548_init_schema`.

## Fixes estructurales (sesión del módulo Proveedores — siguen vigentes)

Antes de esa sesión, **ningún módulo tenant-scoped había sido probado end-to-end**. Se encontraron y corrigieron 4 bugs reales, documentados en detalle en el historial de git (commit "Implementa módulo de Proveedores y corrige bugs..."):

1. Guards (`JwtAuthGuard`/`PermissionsGuard`) nunca registrados globalmente — corregido en `app.module.ts` vía `APP_GUARD`.
2. Errores de tipos de Prisma preexistentes que rompían `pnpm build` — corregido (patrón: `tenantId` explícito desde `@CurrentUser('tenantId')`, `import type` para `TenantPrismaClient`).
3. Bug estructural de NestJS: `TENANT_PRISMA` (request-scoped) se instanciaba antes de que corrieran los guards. Corregido en `tenant-prisma.provider.ts` verificando el JWT de forma independiente.
4. Fuga de `passwordHash` en `/users` — corregido con `select` explícito.

Estos 4 fixes son la base que hace posible que Proveedores y Recepción funcionen; cualquier módulo nuevo debe seguir el mismo patrón (ver ejemplos en `proveedores.service.ts` y `recepcion.service.ts`).

## Backend (`apps/api` — NestJS + Prisma)

### Implementado
- Multi-tenancy: extensión de Prisma con scoping automático por `tenantId` (`src/prisma/extensions/tenant-scoping.extension.ts`).
- **Auth**: login + refresh token JWT (`src/modules/auth`).
- **Users + Roles**: CRUD de usuarios, roles con permisos granulares M2M (`src/modules/users`).
- **Platform**: panel de super-admin, creación manual de tenants (`src/modules/platform`).
- **Tenants**: configuración de empresa (NIT, resolución DIAN) y puntos de compra (`src/modules/tenants`).
- **Proveedores**: CRUD completo (`src/modules/proveedores`) — crear/listar/buscar/filtrar/editar/desactivar/reactivar, validación de duplicados.
- **Calidad**: `GET /calidad/defectos-tipo` — catálogo global de defectos (Cenicafé/FNC), usado por Recepción.
- **Recepción** (`src/modules/recepcion`) — módulo completo:
  - `POST /tabla-precios`, `GET /tabla-precios?fecha=` — tramos de precio por factor de rendimiento + humedad (precio absoluto por kg, vigente por fecha, opcionalmente por punto de compra).
  - `POST /recepcion` — crea una recepción MOJADO (con `AnalisisCalidad` + defectos anidados en la misma transacción, factor de rendimiento calculado o manual, matcheo automático del tramo de precio vigente según humedad+factor) o PASILLA (precio directo negociado, sin análisis de calidad). Genera código correlativo `REC-{año}-{secuencial}` por tenant.
  - `GET /recepcion` (filtros: proveedor, punto de compra, tipo, rango de fechas), `GET /recepcion/:id` (detalle completo).
  - **Alcance deliberadamente limitado en esta pasada**: no hay `PATCH`/`DELETE` de recepciones (son registros financieros — editarlas requiere recalcular inventario/pagos/facturas asociados, se deja para cuando existan esos módulos). Tampoco hay generación de PDF del recibo todavía.
- **Bodega** (`src/modules/bodega`) — módulo completo:
  - `GET /bodega/inventario` — stock agregado por punto de compra + tipo de café, calculado en vivo desde el ledger `MovimientoInventario` (no es una tabla de saldos cacheada).
  - `POST /bodega/secado`, `GET /bodega/secado`, `GET /bodega/secado/:id`, `PATCH /bodega/secado/:id/finalizar` — agrupa una o más recepciones MOJADO (cada una se consume completa, no hay aporte parcial en el MVP), las marca `EN_PROCESO`, y al finalizar con el peso seco resultante calcula el % de rendimiento de secado y genera inventario de PERGAMINO.
  - `POST /bodega/trilla`, `GET /bodega/trilla`, `GET /bodega/trilla/:id` — consume pergamino disponible (valida que haya stock suficiente antes de crear) y genera almendra + rendimiento.
  - `PATCH /bodega/pasilla/:recepcionId/destino` — decide el destino de una recepción de pasilla (MEZCLA con pergamino, generando el movimiento de traspaso; o VENTA_SEPARADA, sin movimiento adicional). Solo se puede decidir una vez.
  - **Gap encontrado y corregido de paso**: `RecepcionService.create()` no generaba ningún `MovimientoInventario` — el módulo de Bodega no habría tenido datos reales sin esto. Ahora cada recepción (mojado o pasilla) genera su entrada de inventario en la misma transacción.
- **Audit log**: registro de cambios en módulos sensibles (`src/common/audit`).
- Guards: `JwtAuthGuard`, `PermissionsGuard`, `PlatformAuthGuard` — registrados globalmente.

Todo lo anterior verificado end-to-end con curl: creación de tramo de precio, recepción mojado con factor calculado y defectos, recepción pasilla, error claro cuando no hay tramo vigente, aislamiento entre tenants, caso de permisos denegados (403), y la cadena completa mojado→secado→pergamino→trilla→almendra + pasilla→mezcla→pergamino con sus validaciones (recepción duplicada en secado, stock insuficiente para trilla, destino ya decidido).

### Pendiente (scaffold vacío — controller/service/module creados pero SIN lógica de negocio)
- `pagos` — pagos a proveedores, anticipos, cuentas por pagar ⬅ **candidato a seguir**
- `facturacion` — adaptador DIAN (Factus/Siigo, decisión de proveedor diferida)
- `ventas` — venta de café procesado (consume el inventario de PERGAMINO/ALMENDRA/PASILLA que ya genera Bodega)
- `reportes` — dashboard y KPIs

## Frontend (`apps/web` — Next.js)

### Implementado
- Cliente API (`lib/api.ts`) y autenticación (`lib/auth.tsx`) con sesión en `localStorage`.
- Login real, layout de dashboard protegido, componentes UI base sin Radix (`components/ui/`).
- **Módulo Proveedores completo**: listado con búsqueda/filtro, alta, edición, validado con Zod compartido (`packages/validation-schemas`).
- **Módulo Recepción completo**:
  - `app/(dashboard)/recepcion/page.tsx` — listado con montos formateados en COP.
  - `app/(dashboard)/recepcion/nueva/page.tsx` — formulario con toggle Mojado/Pasilla, selects de proveedor/punto de compra (poblados desde la API), campos condicionales de calidad (humedad, factor calculado con preview en vivo o manual, defectos con selector del catálogo), campo de precio directo para pasilla.
  - `app/(dashboard)/recepcion/[id]/page.tsx` — detalle de solo lectura.
  - `app/(dashboard)/recepcion/precios/page.tsx` — alta y listado de tramos de precio del día.
  - **Nota de diseño**: este formulario usa estado local (`useState`) en vez de react-hook-form+Zod compartido como Proveedores, porque los campos condicionales (mojado vs. pasilla, factor calculado vs. manual, lista dinámica de defectos) son más simples de manejar así dado el tiempo disponible. La validación fina vive en el backend; el frontend hace solo validación básica de campos requeridos y muestra los errores del servidor.
- **Módulo Bodega completo**:
  - `app/(dashboard)/bodega/page.tsx` — inventario actual y lista de pasillas pendientes de decidir destino (con botones de acción directa).
  - `app/(dashboard)/bodega/secado/page.tsx` + `.../nuevo` + `.../[id]` — listado, alta (selección múltiple de recepciones mojado disponibles por punto de compra, con total en vivo) y detalle con acción de finalizar.
  - `app/(dashboard)/bodega/trilla/page.tsx` — listado y alta en una sola página (como tabla de precios), con preview en vivo del rendimiento.
- `packages/shared-types` ampliado con `PuntoCompra`, `DefectoTipo`, `TablaPrecioTramo`, `AnalisisCalidad`, `DefectoAnalisis`, `Recepcion`, `CategoriaDefecto`, `EstadoProcesoSecado`, `InventarioItem`, `ProcesoSecado`, `TrillaProceso`.

### Pendiente
- Páginas de dashboard aún placeholder: pagos, facturación, reportes, configuración.
- `register` sigue como placeholder — **correcto así** (onboarding manual por diseño).
- No hay refresh automático de token (access token dura 15 min; toca volver a loguear si expira a mitad de una sesión larga).
- No se probó visualmente en un navegador real en ninguna sesión (no hay herramienta de automatización de navegador disponible) — se verificó con `next build`/`next lint` limpios, todas las rutas devolviendo 200, y las formas de datos del frontend confirmadas contra las respuestas reales de la API vía curl.
- Recepción: no hay impresión/PDF del recibo, ni edición/anulación de una recepción ya creada (ver nota de alcance en la sección de backend).
- Bodega/secado "nuevo": la lista de recepciones mojado disponibles no excluye del todo las que ya fueron usadas en otro proceso (el backend sí lo valida y rechaza con mensaje claro, pero la UI no las oculta de antemano).

## Cómo levantar el entorno de desarrollo

```bash
docker compose -f docker/docker-compose.yml up -d postgres
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm --filter api build && node apps/api/dist/src/main   # o: pnpm --filter api start:dev
pnpm --filter web dev   # http://localhost:3000
```

Para crear el primer tenant de prueba: `POST /platform/auth/login` (con `PLATFORM_ADMIN_EMAIL`/`PASSWORD` del seed) y luego `POST /platform/tenants`. Para poder crear una recepción MOJADO hace falta antes crear al menos un punto de compra (`POST /puntos-compra`) y un tramo de precio vigente para la fecha (`POST /tabla-precios`), o usar la página `/recepcion/precios`.

## Cómo retomar en la próxima sesión

1. Leer este archivo.
2. Si hay dudas de diseño, revisar `docs/requerimientos.md`.
3. Siguiente módulo recomendado: **Pagos** — registro de pagos a proveedores (efectivo/transferencia/cheque/crédito) y anticipos, ambos como transacciones independientes que se concilian manualmente (ver decisión en `requerimientos.md`: "Anticipos a proveedores"). Los modelos `Anticipo`, `Pago`, `ConciliacionAnticipo` ya están en el schema. Seguir el mismo patrón que Proveedores/Recepción/Bodega: DTOs con class-validator, service con `@InjectTenantPrisma`, `tenantId` explícito en creates, controller con `@RequirePermissions`, y siempre probar con curl (crear tenant de prueba → login → CRUD) antes de dar el backend por terminado.
4. Al terminar una sesión de trabajo, actualizar este archivo.
