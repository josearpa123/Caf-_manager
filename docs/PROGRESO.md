# Bitácora de Avance del Proyecto

> Este archivo se actualiza al final de cada sesión de trabajo relevante. Es lo primero que hay que leer al retomar el proyecto (junto con `docs/requerimientos.md` para decisiones de diseño ya tomadas).

**Última actualización:** 2026-07-10

## Fase actual (según cronograma en `docs/doc.md` §7.2)

**FASE 2: Desarrollo del MVP — Sprint 3-4**

Terminado: autenticación/usuarios, Proveedores, Recepción (con tabla de precios, catálogo de defectos, y compra directa de pergamino seco), Bodega (inventario, secado, trilla, destino de pasilla), Pagos (anticipos, pagos, conciliación manual, estado de cuenta), Plan/límites por tenant + panel de super-admin + Configuración (puntos de compra, usuarios, roles), fix de bugs estructurales que bloqueaban TODO módulo tenant-scoped.
Siguiente: **Ventas** — venta de café procesado (consume inventario de PERGAMINO/ALMENDRA/PASILLA) para poder calcular rentabilidad por lote; después `facturacion` (adaptador DIAN) y `reportes` (dashboard/KPIs).

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

## Corrección de dominio en Recepción (sesión 2026-07-10, corrige diseño original)

El diseño original (ver Fase 1) le pedía humedad + factor de rendimiento al café **MOJADO** (recién despulpado y lavado) y usaba esos datos para matchear la tabla de precios. Es un error de dominio: el rango de humedad de referencia (10-12%) es el de café **seco**, no el de mojado recién lavado — no tiene sentido medirle humedad a algo que acaba de salir del lavado. Corregido:

- **MOJADO**: ahora precio directo negociado (como pasilla), sin análisis de calidad. Su valor real se sabe después, al secarlo y trillarlo en Bodega.
- **PERGAMINO** (nuevo tipo de recepción, `TipoCafeRecepcion.PERGAMINO`): compra directa de café que el proveedor ya secó por su cuenta. Aquí es donde ahora vive la lógica de humedad + factor de rendimiento + tabla de precios que antes (por error) tenía mojado. Entra a inventario de PERGAMINO directamente (sin pasar por proceso de secado), con `OrigenMovimientoInventario.RECEPCION` — el pergamino que sí se seca en Bodega sigue generando su movimiento con `OrigenMovimientoInventario.PROCESO_SECADO`; el stock es agregado, no distingue origen.
- Migración `20260710154945_pergamino_recepcion_directa` (solo agrega el valor al enum, sin tocar datos existentes).
- Decisión actualizada en `docs/requerimientos.md` (sección "Estados de bodega/conversión").

## Plan/límites por tenant + panel de super-admin (sesión 2026-07-10)

A pedido del usuario: cada tenant es un negocio separado (multi-tenancy ya lo garantizaba), pero faltaba la forma de **administrar cuántos usuarios/puntos de compra puede tener cada uno** y una pantalla para gestionarlo sin tocar la API a mano.

- **Schema**: nuevo modelo `Plan` (`nombre`, `maxUsuarios`, `maxPuntosCompra` nullable = sin límite) + `Tenant.planId` nullable. Migración `20260710155418_plan_tenant_limits`. No es un sistema de facturación/cobro, solo control de acceso — no hay precio ni ciclo de facturación en el modelo.
- **Backend** (`src/modules/platform`): `GET/POST /platform/planes`, `PATCH /platform/planes/:id`; `PATCH /platform/tenants/:id` para asignar plan y cambiar `estado` (ACTIVO/SUSPENDIDO/PRUEBA); `POST /platform/tenants` acepta `planId` opcional. `GET /platform/tenants` incluye el plan y los conteos de usuarios/puntos de compra.
- **Enforcement de límites**: `UsersService.create()` y `PuntosCompraService.create()` rechazan con 400 si el tenant tiene plan asignado y ya alcanzó `maxUsuarios`/`maxPuntosCompra`. Un tenant sin plan asignado no tiene límite.
- **Suspensión real**: `AuthService.login()` y `.refresh()` ahora rechazan con 401 si `tenant.estado === SUSPENDIDO` — antes de este cambio, suspender un tenant desde plataforma no tenía ningún efecto real. Igual que con `user.activo`, esto solo se verifica en login/refresh (no en cada request, el access token de 15 min sigue siendo válido hasta expirar — mismo modelo de seguridad que ya existía para usuarios inactivos).
- **Frontend — panel de plataforma** (`app/platform/*`, fuera del grupo `(dashboard)`): auth completamente separada de la del tenant (`lib/platform-auth.tsx` + `lib/platform-api.ts`, storage keys propios `coffee-manager:platform:*`, login en `/platform/login`). `/platform` lista tenants con plan/estado/conteos y permite cambiar plan (select inline) y suspender/activar (botón inline); `/platform/tenants/nuevo` crea tenant + admin + plan opcional; `/platform/planes` lista y crea planes.
- **Frontend — Configuración del tenant** (`app/(dashboard)/configuracion/*`, ya no es placeholder): página principal muestra el plan actual y uso (usuarios/puntos de compra vs. límite, vía `GET /tenants/me` ampliado con `plan` + `_count`); `/configuracion/puntos-compra` crea y activa/desactiva puntos de compra; `/configuracion/usuarios` crea usuarios (con selección de roles y punto de compra) y activa/desactiva; `/configuracion/roles` crea roles y edita sus permisos con un grid agrupado por módulo (el rol "Administrador" es fijo, no editable — ya validado en el backend).
- `packages/shared-types` ampliado con `EstadoTenant`, `Plan`, `PlatformTenant`, `Role`, `RolePermissionEntry`, `User`, `UserRoleAssignment`, `TenantSelf`.

Verificado end-to-end con curl: creación de plan, asignación a tenant, bloqueo del 2do punto de compra al alcanzar el límite, permiso del 2do usuario y bloqueo del 3ro, suspensión de tenant seguida de login rechazado (401) y reactivación seguida de login exitoso.

### Pendiente / fuera de alcance de esta pasada
- No hay facturación/cobro real de planes (es solo control de acceso, como se acordó con el usuario).
- El panel de plataforma no tiene edición de tenant más allá de plan/estado (nombre, NIT, etc. no editables desde ahí todavía).
- `/configuracion/puntos-compra` no permite editar dirección/teléfono después de creado, solo activar/desactivar (alcance reducido a propósito, ver nota de la sesión).
- El límite de plan solo se aplica a usuarios y puntos de compra — no hay límite de recepciones/almacenamiento ni nada de eso (no se pidió).

## Backend (`apps/api` — NestJS + Prisma)

### Implementado
- Multi-tenancy: extensión de Prisma con scoping automático por `tenantId` (`src/prisma/extensions/tenant-scoping.extension.ts`).
- **Auth**: login + refresh token JWT (`src/modules/auth`).
- **Users + Roles**: CRUD de usuarios, roles con permisos granulares M2M (`src/modules/users`).
- **Platform**: super-admin de plataforma — login propio, CRUD de tenants (con plan y estado) y CRUD de planes (`src/modules/platform`).
- **Tenants**: configuración de empresa (NIT, resolución DIAN), `GET /tenants/me` con plan+conteos, y puntos de compra con límite por plan (`src/modules/tenants`).
- **Proveedores**: CRUD completo (`src/modules/proveedores`) — crear/listar/buscar/filtrar/editar/desactivar/reactivar, validación de duplicados.
- **Calidad**: `GET /calidad/defectos-tipo` — catálogo global de defectos (Cenicafé/FNC), usado por Recepción.
- **Recepción** (`src/modules/recepcion`) — módulo completo (ver corrección de dominio más abajo, sesión 2026-07-10):
  - `POST /tabla-precios`, `GET /tabla-precios?fecha=` — tramos de precio por factor de rendimiento + humedad (precio absoluto por kg, vigente por fecha, opcionalmente por punto de compra). Solo aplica a recepciones de PERGAMINO.
  - `POST /recepcion` — crea una recepción PERGAMINO (con `AnalisisCalidad` + defectos anidados en la misma transacción, factor de rendimiento calculado o manual, matcheo automático del tramo de precio vigente según humedad+factor) o MOJADO/PASILLA (precio directo negociado, sin análisis de calidad). Genera código correlativo `REC-{año}-{secuencial}` por tenant.
  - `GET /recepcion` (filtros: proveedor, punto de compra, tipo, rango de fechas), `GET /recepcion/:id` (detalle completo).
  - **Alcance deliberadamente limitado en esta pasada**: no hay `PATCH`/`DELETE` de recepciones (son registros financieros — editarlas requiere recalcular inventario/pagos/facturas asociados, se deja para cuando existan esos módulos). Tampoco hay generación de PDF del recibo todavía.
- **Bodega** (`src/modules/bodega`) — módulo completo:
  - `GET /bodega/inventario` — stock agregado por punto de compra + tipo de café, calculado en vivo desde el ledger `MovimientoInventario` (no es una tabla de saldos cacheada).
  - `POST /bodega/secado`, `GET /bodega/secado`, `GET /bodega/secado/:id`, `PATCH /bodega/secado/:id/finalizar` — agrupa una o más recepciones MOJADO (cada una se consume completa, no hay aporte parcial en el MVP), las marca `EN_PROCESO`, y al finalizar con el peso seco resultante calcula el % de rendimiento de secado y genera inventario de PERGAMINO.
  - `POST /bodega/trilla`, `GET /bodega/trilla`, `GET /bodega/trilla/:id` — consume pergamino disponible (valida que haya stock suficiente antes de crear) y genera almendra + rendimiento.
  - `PATCH /bodega/pasilla/:recepcionId/destino` — decide el destino de una recepción de pasilla (MEZCLA con pergamino, generando el movimiento de traspaso; o VENTA_SEPARADA, sin movimiento adicional). Solo se puede decidir una vez.
  - **Gap encontrado y corregido de paso**: `RecepcionService.create()` no generaba ningún `MovimientoInventario` — el módulo de Bodega no habría tenido datos reales sin esto. Ahora cada recepción (mojado o pasilla) genera su entrada de inventario en la misma transacción.
- **Pagos** (`src/modules/pagos`) — módulo completo, tres sub-recursos sobre los modelos `Anticipo`/`Pago`/`ConciliacionAnticipo` (ya existían en el schema):
  - `POST /anticipos`, `GET /anticipos`, `GET /anticipos/:id` — anticipo a proveedor como transacción independiente (efectivo/transferencia/cheque; **CREDITO rechazado** con 400, un anticipo siempre es un movimiento de caja real). El detalle calcula `montoConciliado`/`saldoDisponible` en vivo a partir de sus conciliaciones.
  - `POST /pagos`, `GET /pagos`, `GET /pagos/:id` — pago a proveedor, con atajo opcional `recepcionId` para asociarlo a una compra puntual (valida que la recepción sea del mismo proveedor). `metodoPago=CHEQUE` exige `numeroCheque` (`ValidateIf` en el DTO). `metodoPago=CREDITO` sí es válido aquí: es informativo, marca la compra como deuda pendiente sin mover caja real.
  - `POST /conciliaciones`, `GET /conciliaciones` — aplica manualmente un anticipo contra una recepción y/o un pago (exige al menos uno de los dos), valida que ambos pertenezcan al mismo proveedor que el anticipo, y que `montoAplicado` no supere el saldo disponible del anticipo (recalculado sumando sus conciliaciones previas).
  - `GET /pagos/cuenta/:proveedorId` — estado de cuenta informativo del proveedor (total comprado, pagado en efectivo/transferencia/cheque, marcado como crédito, anticipado, conciliado, sin conciliar, saldo pendiente estimado). **No es un saldo autoritativo**: es una vista de solo lectura sobre las transacciones independientes; la reconciliación real la hace el operador a mano (decisión de arquitectura en `requerimientos.md`, "Anticipos a proveedores").
  - Sin `PATCH`/`DELETE` en ningún sub-recurso — mismo alcance deliberadamente limitado que Recepción (son registros financieros).
  - `Pago`, `Anticipo`, `ConciliacionAnticipo` ya estaban en `AUDITED_MODELS` (`audit-log.extension.ts`), así que quedan auditados automáticamente sin código adicional — verificado con una query directa a `AuditLog`.
- **Audit log**: registro de cambios en módulos sensibles (`src/common/audit`).
- Guards: `JwtAuthGuard`, `PermissionsGuard`, `PlatformAuthGuard` — registrados globalmente.

Todo lo anterior verificado end-to-end con curl: creación de tramo de precio, recepción de pergamino con factor calculado/manual y defectos, recepción de mojado y pasilla a precio directo (sin análisis de calidad, rechazadas si falta `precioKg`), error claro cuando no hay tramo vigente para pergamino, aislamiento entre tenants, caso de permisos denegados (403), la cadena completa mojado→secado→pergamino→trilla→almendra + pasilla→mezcla→pergamino con sus validaciones (recepción duplicada en secado, stock insuficiente para trilla, destino ya decidido), y el ciclo anticipo→pago→conciliación→estado de cuenta con sus validaciones (anticipo con CREDITO rechazado, cheque sin número rechazado, conciliación que excede el saldo disponible rechazada, conciliación sin recepción ni pago rechazada).

### Pendiente (scaffold vacío — controller/service/module creados pero SIN lógica de negocio)
- `ventas` — venta de café procesado (consume el inventario de PERGAMINO/ALMENDRA/PASILLA que ya genera Bodega) ⬅ **candidato a seguir**
- `facturacion` — adaptador DIAN (Factus/Siigo, decisión de proveedor diferida)
- `reportes` — dashboard y KPIs

## Frontend (`apps/web` — Next.js)

### Implementado
- Cliente API (`lib/api.ts`) y autenticación (`lib/auth.tsx`) con sesión en `localStorage`.
- Login real, layout de dashboard protegido, componentes UI base sin Radix (`components/ui/`).
- **Módulo Proveedores completo**: listado con búsqueda/filtro, alta, edición, validado con Zod compartido (`packages/validation-schemas`).
- **Módulo Recepción completo**:
  - `app/(dashboard)/recepcion/page.tsx` — listado con montos formateados en COP.
  - `app/(dashboard)/recepcion/nueva/page.tsx` — formulario con toggle Mojado/Pergamino seco/Pasilla, selects de proveedor/punto de compra (poblados desde la API), campos condicionales de calidad (humedad, factor calculado con preview en vivo o manual, defectos con selector del catálogo) solo para Pergamino, campo de precio directo para Mojado/Pasilla.
  - `app/(dashboard)/recepcion/[id]/page.tsx` — detalle de solo lectura.
  - `app/(dashboard)/recepcion/precios/page.tsx` — alta y listado de tramos de precio del día.
  - **Nota de diseño**: este formulario usa estado local (`useState`) en vez de react-hook-form+Zod compartido como Proveedores, porque los campos condicionales (mojado vs. pasilla, factor calculado vs. manual, lista dinámica de defectos) son más simples de manejar así dado el tiempo disponible. La validación fina vive en el backend; el frontend hace solo validación básica de campos requeridos y muestra los errores del servidor.
- **Módulo Bodega completo**:
  - `app/(dashboard)/bodega/page.tsx` — inventario actual y lista de pasillas pendientes de decidir destino (con botones de acción directa).
  - `app/(dashboard)/bodega/secado/page.tsx` + `.../nuevo` + `.../[id]` — listado, alta (selección múltiple de recepciones mojado disponibles por punto de compra, con total en vivo) y detalle con acción de finalizar.
  - `app/(dashboard)/bodega/trilla/page.tsx` — listado y alta en una sola página (como tabla de precios), con preview en vivo del rendimiento.
- **Módulo Pagos completo**:
  - `app/(dashboard)/pagos/page.tsx` — listado de pagos con enlaces a "Estado de cuenta", "Anticipos" y "Nuevo pago".
  - `app/(dashboard)/pagos/nuevo/page.tsx` — formulario de pago; al elegir proveedor carga sus recepciones para el atajo opcional `recepcionId`; campo `numeroCheque` condicional cuando el método es CHEQUE.
  - `app/(dashboard)/pagos/anticipos/page.tsx` + `.../nuevo` — listado y alta de anticipos (selector de método de pago limitado a efectivo/transferencia/cheque, sin CREDITO).
  - `app/(dashboard)/pagos/anticipos/[id]/page.tsx` — detalle del anticipo (monto/conciliado/saldo disponible) con formulario de conciliación inline (contra recepción o contra pago del mismo proveedor, con `max` del input acotado al saldo disponible); se oculta el formulario cuando el saldo llega a cero.
  - `app/(dashboard)/pagos/cuenta/page.tsx` — selector de proveedor + tarjetas KPI con el estado de cuenta (`GET /pagos/cuenta/:id`), con nota explícita de que el saldo es estimado/informativo, no autoritativo.
- **Panel de super-admin** (`app/platform/*`) y **Configuración del tenant** (`app/(dashboard)/configuracion/*`) — ver detalle completo en la sección "Plan/límites por tenant + panel de super-admin" más arriba.
- `packages/shared-types` ampliado con `PuntoCompra`, `DefectoTipo`, `TablaPrecioTramo`, `AnalisisCalidad`, `DefectoAnalisis`, `Recepcion`, `CategoriaDefecto`, `EstadoProcesoSecado`, `InventarioItem`, `ProcesoSecado`, `TrillaProceso`, `Anticipo`, `AnticipoDetalle`, `Pago`, `ConciliacionAnticipo`, `EstadoCuentaProveedor`, `EstadoTenant`, `Plan`, `PlatformTenant`, `Role`, `RolePermissionEntry`, `User`, `UserRoleAssignment`, `TenantSelf`.

### Pendiente
- Páginas de dashboard aún placeholder: facturación, reportes.
- `register` sigue como placeholder — **correcto así** (onboarding manual por diseño).
- No hay refresh automático de token (access token dura 15 min; toca volver a loguear si expira a mitad de una sesión larga).
- No se probó visualmente en un navegador real en ninguna sesión (no hay herramienta de automatización de navegador disponible) — se verificó con `next build`/`next lint` limpios, todas las rutas devolviendo 200, y las formas de datos del frontend confirmadas contra las respuestas reales de la API vía curl.
- Recepción: no hay impresión/PDF del recibo, ni edición/anulación de una recepción ya creada (ver nota de alcance en la sección de backend).
- Bodega/secado "nuevo": la lista de recepciones mojado disponibles no excluye del todo las que ya fueron usadas en otro proceso (el backend sí lo valida y rechaza con mensaje claro, pero la UI no las oculta de antemano).
- Pagos: no hay página de detalle de un pago individual (la lista ya muestra proveedor/recepción/método/monto, que cubre el caso de uso principal); tampoco hay filtros de fecha/proveedor en la UI de listados (el backend sí los soporta vía query params).

## Cómo levantar el entorno de desarrollo

```bash
docker compose -f docker/docker-compose.yml up -d postgres
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm --filter api build && node apps/api/dist/src/main   # o: pnpm --filter api start:dev
pnpm --filter web dev   # http://localhost:3000
```

Para crear el primer tenant de prueba: entrar a `/platform/login` con `PLATFORM_ADMIN_EMAIL`/`PASSWORD` del seed (o `POST /platform/auth/login` por curl) y crear el tenant desde `/platform/tenants/nuevo` (o `POST /platform/tenants`). Puntos de compra, usuarios y roles ya se pueden crear desde `/configuracion` dentro del dashboard del tenant, no hace falta curl. Para poder crear una recepción de PERGAMINO hace falta un tramo de precio vigente para la fecha (`POST /tabla-precios` o la página `/recepcion/precios`) — mojado y pasilla no lo necesitan (precio directo).

## Cómo retomar en la próxima sesión

1. Leer este archivo.
2. Si hay dudas de diseño, revisar `docs/requerimientos.md`.
3. Siguiente módulo recomendado: **Ventas** — registro simple de venta de café procesado (comprador, cantidad, precio, lotes/recepciones de origen), consume el inventario agregado de PERGAMINO/ALMENDRA/PASILLA que ya genera Bodega (no lote por lote exacto, pero conserva referencia a los lotes de origen — ver `requerimientos.md`: "Ventas (detalle)"). Sin factura electrónica ni control de método de pago todavía (eso es `facturacion`, que sigue después). El modelo `Venta`/`VentaLoteOrigen` ya está en el schema. Seguir el mismo patrón que Proveedores/Recepción/Bodega/Pagos: DTOs con class-validator, service con `@InjectTenantPrisma`, `tenantId` explícito en creates, controller con `@RequirePermissions`, y siempre probar con curl (crear tenant de prueba → login → CRUD) antes de dar el backend por terminado. Revisar `getStockDisponible` en `bodega.service.ts` como referencia para descontar inventario al vender.
4. Al terminar una sesión de trabajo, actualizar este archivo.
