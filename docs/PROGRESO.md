# Bitácora de Avance del Proyecto

> Este archivo se actualiza al final de cada sesión de trabajo relevante. Es lo primero que hay que leer al retomar el proyecto (junto con `docs/requerimientos.md` para decisiones de diseño ya tomadas).

**Última actualización:** 2026-07-11

## Módulo de Préstamos a proveedores (sesión 2026-07-11)

Pedido del usuario: un módulo de préstamos, adicional a los ya existentes. Antes de construir se confirmaron 3 decisiones de diseño con el usuario: (1) se presta **al proveedor/caficultor** (financiación al productor), no es deuda propia del negocio; (2) **sin interés** — solo se lleva el capital prestado y sus abonos; (3) se devuelve con **abonos en efectivo/transferencia**, como pagos independientes al préstamo (NO se descuenta del café entregado — eso lo cubre el concepto ya existente de `Anticipo`). El préstamo es, por tanto, un concepto distinto del anticipo: el anticipo se concilia contra café, el préstamo se devuelve con dinero.

- **Schema**: dos modelos nuevos + un enum. `Prestamo` (código `PRE-{año}-{secuencial}` único por tenant, proveedor, punto de compra, `monto`, `fecha`, `estado`: VIGENTE/PAGADO/CANCELADO, notas) y `AbonoPrestamo` (monto, `metodoPago`, referencia, notas; `onDelete: Cascade` desde el préstamo). Enum `EstadoPrestamo`. Nuevos permisos `PRESTAMOS_VER/CREAR/EDITAR` (mismo patrón que Anticipos). Migración `20260711175720_prestamos_proveedor`. Ambos modelos agregados a `TENANT_SCOPED_MODELS` y a `AUDITED_MODELS` (auditados automáticamente).
- **Backend** (`src/modules/prestamos`, un solo service/controller):
  - `POST /prestamos` — crea el préstamo en VIGENTE (valida proveedor y punto de compra activos, genera el código correlativo en transacción, mismo patrón que ContratoVenta).
  - `GET /prestamos` (filtros: proveedor, punto de compra, estado, rango de fechas), `GET /prestamos/:id` — cada préstamo devuelve `saldoPendiente` y `totalAbonado` **calculados al vuelo** (no se persisten), coherente con Anticipo.
  - `POST /prestamos/:id/abonos` — registra un abono; **CREDITO rechazado** con 400 (un abono es siempre caja real que entra); rechaza si el abono excede el saldo pendiente; si el abono salda el préstamo (tolerancia 0.01) lo marca `PAGADO` en la misma transacción; rechaza abonar a un préstamo no vigente.
  - `PATCH /prestamos/:id/cancelar` — solo si está VIGENTE (el saldo pendiente queda sin cobrar).
  - Verificado end-to-end con curl (tenant de prueba sembrado directo en DB): creación con código correlativo y saldo=monto, abono parcial (saldo baja, sigue VIGENTE), rechazo de abono que excede saldo, rechazo de CREDITO, abono final → transición automática a PAGADO con saldo 0, rechazo de abono a préstamo pagado, cancelación de un segundo préstamo → CANCELADO con rechazo de abono posterior y de re-cancelación, filtros por estado, y auditoría confirmada por query directa a `AuditLog` (2× Prestamo CREAR, 2× AbonoPrestamo CREAR, 2× Prestamo EDITAR por las transiciones PAGADO/CANCELADO).
- **Frontend**: nuevo ítem de nav "Préstamos" (icono `HandCoins`) en el dashboard del tenant, más un acceso desde `/pagos`. `/prestamos` (listado con código, monto, saldo pendiente y badge de estado), `/prestamos/nuevo` (proveedor + punto de compra + monto + notas, mismo patrón que `/pagos/anticipos/nuevo`), `/prestamos/[id]` (resumen monto/abonado/saldo/estado, historial de abonos, formulario inline de abono acotado al saldo con `max`, y botón "Cancelar préstamo" con confirmación — visibles solo si VIGENTE). Grupo "Préstamos" agregado al grid de permisos en `/configuracion/roles`. `packages/shared-types`: `EstadoPrestamo`, `Prestamo`, `PrestamoDetalle`, `AbonoPrestamo` + los 3 permisos. Verificado con `pnpm build` limpio (turbo, api + web) y la ruta `/prestamos` sirviendo 200.

### Integración con el estado de cuenta del proveedor (misma sesión)
A pedido del usuario, se integró el saldo de préstamos en `GET /pagos/cuenta/:proveedorId` (`PagosService.estadoCuenta`): se agregaron `totalPrestado`, `totalAbonadoPrestamos` y `saldoPrestamosPendiente` (solo préstamos **VIGENTES** — los PAGADOS están en cero y los CANCELADOS anulados), más `saldoNeto` = `saldoPendienteEstimado` − `saldoPrestamosPendiente` (positivo = el negocio le debe neto; negativo = el proveedor debe neto). **No se alteró la semántica de `saldoPendienteEstimado`** (sigue siendo compras − pagos − conciliado); el préstamo es dinero en dirección opuesta (lo que el proveedor debe al negocio), por eso se muestra aparte y se netea explícitamente. Frontend `/pagos/cuenta` ampliado con las 3 tarjetas de préstamos + tarjeta de "Saldo neto" con leyenda de a favor de quién. `packages/shared-types` `EstadoCuentaProveedor` ampliado. Verificado con curl: préstamo vigente de 800k con abono de 300k → `saldoPrestamosPendiente` 500k, `saldoNeto` −500k, excluyendo correctamente los préstamos pagado/cancelado del mismo proveedor.

### Pendiente / fuera de alcance
- El préstamo aún **no aparece en el dashboard de Reportes** como KPI propio (el estado de cuenta del proveedor sí lo integra, ver arriba). Sería el mismo cálculo agregado por si se quiere un KPI de "préstamos por cobrar".
- Sin interés por decisión explícita del usuario — si en el futuro se necesita, habría que agregar tasa + cálculo sobre saldo (no está modelado).
- Los permisos nuevos `PRESTAMOS_*` se conceden automáticamente al rol "Administrador" al **crear** un tenant (`Object.values(Permission)` en registro/platform). Tenants creados **antes** de esta migración no los tienen en su rol Administrador hasta hacer backfill (agregar las filas `RolePermission` o reasignar permisos desde `/configuracion/roles`), porque el guard no tiene bypass de admin — resuelve permisos desde `RolePermission`.
- Sin `PATCH`/`DELETE` de un préstamo o abono ya creados (mismo alcance deliberadamente limitado que Pagos/Anticipos: son registros financieros).

## Rediseño de dashboards + Solicitudes de registro (sesión 2026-07-10, continuación)

Dos pedidos del usuario en la misma pasada: (1) llevar el mismo nivel de diseño de la landing a las dashboards internas (tenant y plataforma), y (2) en el panel de plataforma, una sección dedicada de "Solicitudes" donde aparezca cada autorregistro con su info completa y se pueda aprobar o rechazar.

- **Schema**: nuevo valor `RECHAZADO` en `EstadoTenant` (migración `20260710213817_add_estado_rechazado`) — bloquea login igual que `PENDIENTE`/`SUSPENDIDO`, vía el mismo `assertTenantAccesible()`. Esto resuelve el "fuera de alcance" de la sesión anterior ("no hay acción de rechazar").
- **Backend**:
  - `RegistrarTenantDto` acepta `adminTelefono` opcional; se guarda tanto en `User.telefono` como en `Tenant.telefono` (antes ningún registro capturaba teléfono de contacto).
  - `PlatformService.listTenants()` ahora incluye `contacto: { nombre, email, telefono }` — el primer usuario creado en la transacción de alta (admin que se registró o para quien se creó el tenant manualmente), sin necesidad de endpoint nuevo. `PATCH /platform/tenants/:id` ya soportaba cualquier valor del enum `estado`, así que `RECHAZADO` funciona sin tocar el controller.
  - Verificado con curl: registro con teléfono → aparece en `/platform/tenants` con `contacto` completo → aprobado con plan asignado en el mismo request.
- **Frontend**:
  - Componentes nuevos compartidos: `components/shell/app-shell.tsx` (sidebar unificado, antes duplicado casi textual entre `(dashboard)/layout.tsx` y `platform/layout.tsx` — ahora un solo componente con `font-display` en la marca, indicador de sección activa con acento lateral, badges de conteo), `components/shell/page-header.tsx` (título+descripción+acciones consistente) y `components/shell/stat-card.tsx` (tarjeta KPI, reemplaza la copia local que tenía `reportes/page.tsx`). `components/ui/dialog.tsx` — modal ligero sin dependencias nuevas (no hay Radix en el proyecto), con Escape/click-afuera para cerrar.
  - **`/platform/solicitudes`** (página nueva): tarjetas por cada tenant `PENDIENTE` con contacto (nombre/email/teléfono), NIT, fecha, selector de plan a asignar, y botones Aprobar/Rechazar que abren un `Dialog` de confirmación antes de aplicar el cambio. Nav del panel de plataforma con ítem "Solicitudes" y badge con el conteo de pendientes.
  - `/platform/page.tsx` (Tenants) simplificado: ya no tiene el botón "Aprobar" inline (se movió a Solicitudes) — un tenant `PENDIENTE` muestra "Revisar solicitud" que enlaza allá; `RECHAZADO` se puede reactivar con el mismo botón "Activar" que ya existía para `SUSPENDIDO`.
  - **Barrido de las ~34 páginas internas restantes** (bodega, recepción, ventas, pagos, facturación, configuración, y el resto de plataforma): headers `<h1 className="text-2xl font-semibold">` migrados a `<PageHeader>` — visual únicamente, sin tocar lógica de negocio ni estructura de tablas. `pagos/cuenta/page.tsx` quedó con su `StatCard` local sin consolidar (no era parte de esta pasada).
  - `app/(auth)/register/page.tsx` — nuevo campo opcional "Teléfono de contacto".
  - `packages/shared-types`: `EstadoTenant.RECHAZADO`, `PlatformTenant.telefono` + `PlatformTenant.contacto`.
  - Verificado con `pnpm --filter web build` limpio (38 rutas, sin errores nuevos) y con curl end-to-end: registro nuevo → aparece en `/platform/tenants` con `contacto`/`telefono` → visible como pendiente. **No se probó visualmente en navegador** (mismo límite de siempre, sin herramienta de automatización disponible).

### Pendiente / fuera de alcance
- "Dar permisos" al aprobar no tiene un control granular nuevo: el rol "Administrador" que se crea en el registro ya tiene *todos* los permisos dentro de su tenant (así funcionaba desde antes) — lo único que la aprobación controla de verdad es el `estado` y el `plan` (que fija `maxUsuarios`/`maxPuntosCompra`). Si en el futuro se quiere que el plan también limite *qué módulos* puede ver un tenant (no solo cuántos usuarios/puntos de compra), es una feature nueva, no estaba pedida explícitamente esta vez.
- Sin motivo de rechazo persistido (el enum solo guarda el estado, no un texto con la razón) — si hace falta auditar por qué se rechazó algo, hoy solo queda en `AuditLog` genérico (el modelo `Tenant` está en `AUDITED_MODELS`), no en un campo dedicado.
- Sin notificación por correo al aprobar/rechazar (mismo pendiente de la sesión anterior, sigue sin haber servicio de email).

## Landing page pública + autorregistro con aprobación (sesión 2026-07-10)

Pedido del usuario: una página principal pública (Inicio/Sobre nosotros/Planes) con los logins visibles, y que el registro esté habilitado pero la cuenta quede pendiente de activación — la aprueba un admin de plataforma según el plan. Esto reemplaza la decisión anterior de la Fase 1 ("onboarding manual por diseño, `/register` placeholder") — ahora hay dos caminos: autorregistro público (pendiente de aprobación) o alta manual desde `/platform/tenants/nuevo`, conviven sin conflicto.

- **Schema**: nuevo valor `PENDIENTE` en `EstadoTenant` (migración `20260710210331_tenant_pendiente_aprobacion`). Un tenant `PENDIENTE` no puede iniciar sesión — mismo mecanismo que ya bloqueaba `SUSPENDIDO` (`AuthService`), factorizado en un solo `assertTenantAccesible()` con mensaje distinto para cada caso.
- **Backend** — nuevo módulo público `src/modules/registro` (sin ningún guard, endpoints con `@Public()`):
  - `GET /registro/planes` — catálogo de planes reducido a solo lo necesario para mostrar precios/límites en la página pública (sin datos internos).
  - `POST /registro` — autorregistro: crea Tenant en `PENDIENTE` (+ plan elegido opcional) + rol "Administrador" con todos los permisos + primer usuario, mismo patrón transaccional que `PlatformService.createTenant`, pero **forzando el estado** (un registro público nunca puede activarse solo, ni aunque alguien manipule el request). Rechaza correos duplicados con mensaje claro (`409 Ese correo ya está registrado`) en vez de dejar pasar un error crudo de Postgres.
  - Aprobar sigue siendo el mismo `PATCH /platform/tenants/:id` que ya existía (`{ estado: 'ACTIVO' }`) — no hizo falta un endpoint nuevo para eso.
  - Verificado con curl: registro público → login rechazado (`PENDIENTE`) → aparece en `/platform/tenants` → `PATCH` a `ACTIVO` → login exitoso. Y el rechazo por correo duplicado.
- **Frontend**:
  - `app/page.tsx` (raíz) reemplazado: antes redirigía siempre a `/login` o `/proveedores`; ahora, si no hay sesión, muestra una landing real (hero, características, "Sobre nosotros", "Planes" con los datos de `/registro/planes`, CTA) con botones **Ingresar** y **Crear cuenta** en el header, y un link discreto a `/platform/login` en el footer (no se promociona al público general). Si hay sesión activa, sigue redirigiendo al dashboard como antes.
  - `app/(auth)/register/page.tsx` — antes placeholder, ahora formulario real (nombre del negocio, NIT opcional, datos del admin con `PasswordInput`, plan opcional) que llama a `POST /registro` y muestra el mensaje de "pendiente de aprobación" en vez de loguear automáticamente.
  - `app/platform/page.tsx` — Badge nuevo para `PENDIENTE`, los tenants pendientes se listan primero, aviso visible cuando hay alguno. *(Actualización: el botón de aprobar/rechazar en sí se movió a `/platform/solicitudes` en la sesión siguiente, ver sección "Rediseño de dashboards + Solicitudes de registro" más arriba.)*
  - `packages/shared-types`: `EstadoTenant.PENDIENTE` + `PlanPublico` (forma reducida de `Plan` para el endpoint público).

### Pendiente / fuera de alcance
- Sin envío de correo al aprobar/registrar (no hay servicio de email integrado en el proyecto) — el usuario se entera revisando `/platform` manualmente, o el interesado reintentando login.
- ~~No hay acción de "rechazar" un registro pendiente~~ — resuelto en la sesión siguiente con `EstadoTenant.RECHAZADO`, ver sección "Rediseño de dashboards + Solicitudes de registro" más arriba.
- El copy de "Sobre nosotros" es un placeholder razonable centrado en el producto (no tengo la historia real de la empresa) — se edita directamente en `app/page.tsx` cuando haya contenido de marca definitivo.

## Contratos de venta anticipada (sesión 2026-07-10)

Pedido del usuario (gerente de compra): vender café por adelantado a una trilladora, fijando precio hoy, y que cuando efectivamente se venda/entregue el café más adelante, sea a ese precio ya pactado. Antes de construir se confirmaron 3 decisiones de diseño con el usuario: (1) las entregas contra un contrato son parciales — se va cumpliendo con varias ventas a medida que sale cosecha, no una sola entrega; (2) las trilladoras NO dan anticipo en dinero al firmar, solo se paga al entregar (así que no hace falta un concepto de "anticipo de venta", más simple que los `Anticipo` a proveedores); (3) el vencimiento del contrato es solo informativo, nunca bloquea ni cancela nada automáticamente — lo decide el operador.

- **Schema**: nuevo modelo `ContratoVenta` (código `CTR-{año}-{secuencial}`, comprador, tipo de café, `cantidadKgPactada`/`cantidadKgEntregada`, `precioKg` fijo, `fechaLimite` opcional, `estado`: VIGENTE/CUMPLIDO/CANCELADO) + `Venta.contratoVentaId` opcional. Migración `20260710203417_contratos_venta_anticipada`. Agregado a `TENANT_SCOPED_MODELS` y `AUDITED_MODELS`.
- **Backend** (`src/modules/ventas/contratos-venta.{service,controller}.ts`, permisos `VENTAS_*` reutilizados, sin permisos nuevos):
  - `POST /contratos-venta` — crea el contrato en VIGENTE.
  - `GET /contratos-venta`, `GET /contratos-venta/:id` — cada contrato devuelve `saldoPendienteKg` y `vencido` **calculados al vuelo** (no se persisten), coherente con la decisión de que el vencimiento es solo informativo.
  - `PATCH /contratos-venta/:id/cancelar` — solo si está VIGENTE.
  - **`VentasService.create()` extendido**: `CreateVentaDto.contratoVentaId` opcional. Si se manda, `tipoCafe`/`precioKg`/`compradorId`/`compradorNombre` se **derivan del contrato del lado del servidor** (el cliente no los controla, así el precio queda de verdad bloqueado) y se valida que `cantidadKg` no exceda el saldo pendiente del contrato — independiente de la validación de stock físico disponible, que sigue aplicando igual. Dentro de la misma transacción que crea la venta, incrementa `cantidadKgEntregada` del contrato y lo marca `CUMPLIDO` si llega a completarse.
  - Verificado con curl: contrato de 20kg cumplido con dos entregas parciales (12+8) tomando el precio del contrato sin que el cliente lo mande, transición automática a CUMPLIDO, rechazo de venta contra contrato ya cumplido/cancelado, rechazo por exceder saldo del contrato (independiente del rechazo por falta de stock físico, probado por separado), y cancelación de contrato sin entregas.
- **Frontend**: `/ventas/contratos` (listado con badge de estado + "Vencido" si aplica), `/ventas/contratos/nuevo`, `/ventas/contratos/[id]` (resumen, saldo, historial de entregas con link a cada venta, botón cancelar, botón "Registrar entrega" que lleva a `/ventas/nueva?contratoVentaId=...`). `/ventas/nueva` ahora tiene un selector de contrato opcional al inicio del formulario: al elegir uno, bloquea (deshabilita) tipo de café, comprador y precio, y limita la cantidad al saldo pendiente — la venta libre (sin contrato) sigue funcionando exactamente igual que antes.

### Pendiente / fuera de alcance
- Sin anticipo de venta (dinero que entra del comprador) — decisión explícita del usuario, no aplica a su operación.
- El contrato no valida que haya stock disponible al momento de crearlo (es normal: se pactan contratos antes de tener el café listo) — la validación de stock ocurre en cada venta/entrega individual, como cualquier venta normal.
- No hay recordatorio/notificación de contratos por vencer — el campo `vencido` es visible en la UI pero pasivo, no genera alertas todavía (mismo patrón que las notificaciones in-app pendientes del resto del sistema).

## Exportar Excel en Reportes + sesión más larga con refresh silencioso (sesión 2026-07-10)

Dos pedidos puntuales del usuario:

**1. Exportar a Excel desde Reportes**: `GET /reportes/exportar` (`REPORTES_EXPORTAR`) genera un `.xlsx` real con `exceljs` (nueva dependencia en `apps/api`), no un CSV renombrado. 6 hojas: Resumen (KPIs + filtros aplicados), Compras por tipo, Ventas por tipo, Inventario actual, Saldo proveedores (con fila de total), y Detalle de compras (recepciones fila por fila, igual que el CSV existente pero dentro del mismo archivo). Reutiliza `ReportesService.dashboard()` para no duplicar la lógica de agregación. Frontend: botón "Exportar a Excel" junto al CSV existente (renombrado "Detalle de compras (CSV)" para diferenciarlos), mismo patrón fetch+blob+descarga. Verificado con curl: el archivo descargado es un `.xlsx` válido (`file` lo reconoce como "Microsoft Excel 2007+") con las 6 hojas esperadas.

**2. Sesión demasiado corta**: el usuario reportó que lo sacaba a los ~15 min estando activo (cargando recepciones). Causa: el access token duraba 15 min y el frontend nunca usaba el refresh token que ya emitía el backend — solo lo guardaba para el logout. Arreglado sin tocar el modelo de seguridad (el access token sigue siendo corto a propósito):
- `lib/api.ts`: cualquier request que reciba 401 ahora intenta renovar con `POST /auth/refresh` usando el refresh token guardado, y si funciona reintenta la petición original una vez — todo transparente para el usuario. Con múltiples peticiones 401 casi simultáneas (ej. volver de segundo plano), se comparte un único intento de refresh en vuelo (`refreshInFlight`) para no pisarse el refresh token, que es de un solo uso. Si el refresh también falla (token vencido/revocado — a los 30 días de inactividad real), dispara un evento `auth:session-expired` que `AuthProvider` escucha para limpiar la sesión y mandar a `/login`.
- `lib/auth.tsx`: ya no maneja el refresh token por su cuenta, usa los helpers centralizados de `api.ts` (`getRefreshToken`/`setRefreshToken`/`clearRefreshToken`).
- Backend: `JWT_ACCESS_EXPIRES_IN` subido de 15 a 30 min (colchón adicional, la renovación automática es el arreglo real). Plataforma (panel de super-admin) no tiene refresh token propio — es uso interno poco frecuente — así que en cambio se le subió el token a 8h (`JWT_PLATFORM_EXPIRES_IN`, nuevo). Verificado con curl: token de tenant dura 1800s, token de plataforma 28800s, y `/auth/refresh` rota correctamente el access+refresh token.
- **Resultado esperado**: mientras el usuario tenga la pestaña abierta y siga usando la app (cualquier petición dispara la renovación si hace falta), la sesión no debería cortarse antes de los 30 días del refresh token. Solo se cierra sesión si el refresh también está vencido/revocado.

## Rediseño visual del frontend (sesión 2026-07-10, con skill de diseño UI/UX)

A petición del usuario: mejorar el diseño en general + detalle puntual del ojo para mostrar/ocultar contraseña. Alcance: solo visual/UX, sin cambios de backend ni de flujos.

- **Tokens** (`app/globals.css`, `tailwind.config.ts`): el color primario café/terracota ya existía (buena base) pero los neutrales eran fríos (slate) y desentonaban — ahora toda la paleta es "warm" y coherente. Se agregaron tokens `success`/`warning` (antes solo había `destructive`).
- **Primitivas nuevas** en `components/ui/`: `Badge` (estados con color semántico), `PasswordInput` (toggle mostrar/ocultar con iconos `Eye`/`EyeOff` de `lucide-react`, que ya estaba en dependencias), `Table`/`TableHeader`/`TableRow`/`TableCell`/`TableEmpty` (header, hover de fila, y empty state consistentes en todos lados). `Button`/`Input`/`Select` pulidos (focus rings, transiciones, cursor-pointer, feedback de presión).
- **Sidebars** del dashboard del tenant y del panel de plataforma rediseñados con iconos por sección (lucide), estado activo con acento de color, avatar con iniciales, logout como botón de ícono.
- **Barrido completo** de los ~16 listados con tabla en toda la app (proveedores, recepción×2, bodega×3, pagos×2, ventas×2, configuración×2, plataforma×2, facturación, reportes×2): tablas raw → componente `Table`; texto plano de estado ("Activo"/"Pendiente"/etc.) → `Badge`. Helper compartido `lib/badge-variants.ts` para mapear tipo de café → color de badge de forma consistente.
- **Toggle de contraseña** aplicado en los 4 formularios que la piden: login de tenant, login de plataforma, crear usuario (`/configuracion/usuarios`), crear tenant (`/platform/tenants/nuevo`).
- Corregido de paso: `/recepcion/precios` tenía un texto desactualizado ("solo aplica a café mojado") que quedó mal después de la corrección de dominio de la sesión anterior (ahora dice pergamino).
- Verificado con `next build` limpio y arrancando el dev server real (curl a todas las rutas → 200, HTML de `/login` confirmado con el nuevo copy y el botón "Mostrar contraseña" presente). **No se probó visualmente en navegador** — sigue sin haber herramienta de automatización de navegador en este entorno; toda la verificación fue a nivel de build/HTML/tipos, no de captura visual.

## Fase actual (según cronograma en `docs/doc.md` §7.2)

**FASE 2: Desarrollo del MVP — Sprint 3-4**

Terminado: autenticación/usuarios, Proveedores, Recepción (con tabla de precios, catálogo de defectos, y compra directa de pergamino seco), Bodega (inventario, secado, trilla, destino de pasilla), Pagos (anticipos, pagos, conciliación manual, estado de cuenta), Plan/límites por tenant + panel de super-admin + Configuración (puntos de compra, usuarios, roles), Ventas (compradores, venta con trazabilidad de lotes de origen, descuento de inventario), Reportes (dashboard con los 4 KPIs prioritarios + exportación CSV), Facturación electrónica (ciclo completo crear/emitir/anular con adaptador enchufable, sin conector real todavía — decisión explícita del usuario), fix de bugs estructurales que bloqueaban TODO módulo tenant-scoped.
**Los 8 módulos de negocio del MVP original ya están implementados.** Lo que queda es: (a) conectar un proveedor tecnológico real de facturación (Factus/Siigo) el día que el usuario decida cuál — no requiere rediseño, ver sección de Facturación más abajo; (b) pulido/QA visual en navegador real (nunca se probó, no hay herramienta de automatización disponible en este entorno); (c) mejoras menores documentadas como "Pendiente" en cada módulo.

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
- **Ventas** (`src/modules/ventas`) — módulo completo, dos sub-recursos:
  - **Compradores**: CRUD simple (`crear/listar/ver/editar` — sin `createdById`, el modelo no lo tiene) para reutilizar compradores frecuentes; `Venta.compradorNombre` siempre queda como texto libre (copiado del comprador seleccionado o escrito a mano), `compradorId` es opcional.
  - **Ventas**: `POST /ventas` — vende un `tipoCafe` (`TipoInventario`: MOJADO/PERGAMINO/ALMENDRA/PASILLA) de un punto de compra. Valida stock disponible con `BodegaService.getStockDisponible()` (mismo helper que usa Trilla), genera código `VTA-{año}-{secuencial}`, y en la misma transacción crea la `Venta`, sus `VentaLoteOrigen` (trazabilidad hacia las recepciones de origen) y el `MovimientoInventario` de SALIDA con `origen=VENTA`.
  - **Validación de trazabilidad**: la suma de `lotesOrigen[].cantidadKgAtribuida` debe coincidir con `cantidadKg` de la venta (tolerancia de redondeo 0.01 kg) — rechazada con 400 si no cuadra. Las recepciones referenciadas solo se validan por existencia/tenant, no por tipo: la trazabilidad se detiene a nivel de recepción por decisión de diseño (no se rastrea el camino secado/trilla → recepción original, ver `requerimientos.md`).
  - `GET /ventas` (filtros: punto de compra, comprador, tipo, rango de fechas), `GET /ventas/:id` (detalle con lotes de origen).
  - Sin `PATCH`/`DELETE` — mismo alcance deliberadamente limitado que Recepción/Pagos (registros que tocan inventario).
  - `VentasModule` importa `BodegaModule` para inyectar `BodegaService` (patrón: un módulo de negocio dependiendo de otro vía `imports`, primera vez que se usa así en este backend).
- **Reportes** (`src/modules/reportes`) — módulo completo, los 4 KPIs prioritarios de `requerimientos.md` más un par de agregados que ya eran gratis con los datos existentes:
  - `GET /reportes/dashboard?puntoCompraId=&desde=&hasta=` — compras por período (agrupadas por tipo de café, con kg/valor/conteo), ventas por período (igual), margen bruto del período (ventas − compras, simple, no es rentabilidad por lote), calidad promedio comprada (humedad y factor de rendimiento promedio, **solo sobre recepciones de PERGAMINO** porque son las únicas con análisis de calidad desde la corrección de dominio), inventario actual (reutiliza `BodegaService.getInventario()`), y saldo pendiente estimado a proveedores (top 10 + total, misma fórmula que `PagosService.estadoCuenta` pero calculada en lote con `groupBy` para todos los proveedores en una sola pasada en vez de N llamadas).
  - **Nota de filtrado**: `desde`/`hasta` solo acotan compras/ventas/calidad (son flujos de un período); inventario y saldo pendiente son estado actual, no tienen sentido filtrados por fecha, así que siempre reflejan el momento presente.
  - `GET /reportes/compras/exportar?...` — exporta CSV de las recepciones del período (mismo filtro), gated tras el permiso `REPORTES_EXPORTAR` (separado de `REPORTES_VER`). Usa `@Res()` de Express directamente para poder mandar `Content-Type: text/csv` y `Content-Disposition: attachment`.
  - `ReportesModule` importa `BodegaModule` (mismo patrón que `VentasModule`).
- **Facturación** (`src/modules/facturacion`) — módulo completo con patrón adaptador, a petición explícita del usuario ("que quede lista solo si en algún momento se quiere conectar"):
  - **`adapters/facturacion-provider.interface.ts`**: contrato `FacturacionProviderAdapter` (`emitir()`/`anular()`) que debe implementar cualquier conector real.
  - **`adapters/ninguno.provider.ts`**: implementación por defecto (única registrada hoy) — **no simula una emisión**, rechaza con `BadRequestException` y un mensaje explícito de que no hay proveedor conectado. Decisión deliberada: mejor fallar claro que generar un CUFE falso.
  - **`adapters/facturacion-provider.factory.ts`**: resuelve el adapter según `Factura.proveedorTecnologico`. Conectar Factus/Siigo el día de mañana es: crear una clase que implemente la interfaz + agregarla a los providers de `FacturacionModule` + un `case` nuevo en el factory — **no toca `FacturacionService` ni el resto del módulo**.
  - `POST /facturacion` — crea el registro en `PENDIENTE` para una recepción (1:1, rechaza duplicados).
  - `POST /facturacion/:id/emitir` — resuelve el adapter y lo invoca; con el adapter `NINGUNO` esto siempre falla (por diseño) y deja la factura en estado `ERROR`. Cuando se conecte un proveedor real, este mismo endpoint empieza a funcionar sin cambios.
  - `POST /facturacion/:id/anular` — solo si `estado=EMITIDA` y tiene `cufe`.
  - `GET /facturacion`, `GET /facturacion/:id` (filtros: punto de compra, estado).
  - **Deliberadamente fuera de alcance**: no hay CRUD de `ResolucionFacturacion` (la resolución/rango de numeración DIAN) — no aporta nada mientras no haya un proveedor real emitiendo, se construye junto con el conector real.
  - `Factura` ya estaba en `AUDITED_MODELS`, queda auditada automáticamente.
- **Audit log**: registro de cambios en módulos sensibles (`src/common/audit`).
- Guards: `JwtAuthGuard`, `PermissionsGuard`, `PlatformAuthGuard` — registrados globalmente.

Todo lo anterior verificado end-to-end con curl: creación de tramo de precio, recepción de pergamino con factor calculado/manual y defectos, recepción de mojado y pasilla a precio directo (sin análisis de calidad, rechazadas si falta `precioKg`), error claro cuando no hay tramo vigente para pergamino, aislamiento entre tenants, caso de permisos denegados (403), la cadena completa mojado→secado→pergamino→trilla→almendra + pasilla→mezcla→pergamino con sus validaciones (recepción duplicada en secado, stock insuficiente para trilla, destino ya decidido), el ciclo anticipo→pago→conciliación→estado de cuenta con sus validaciones (anticipo con CREDITO rechazado, cheque sin número rechazado, conciliación que excede el saldo disponible rechazada, conciliación sin recepción ni pago rechazada), venta de pergamino comprado directo con descuento real de inventario (100kg → 40kg tras vender 60kg), rechazando suma de lotes que no cuadra y cantidad que excede el stock disponible, el dashboard de reportes con sus 5 bloques (compras/ventas por tipo, margen del período, calidad promedio, inventario, saldo pendiente) devolviendo ceros correctamente cuando el rango de fechas no tiene datos pero manteniendo inventario/saldo (que no son de período) más la exportación CSV, y el ciclo de facturación completo (crear → duplicado rechazado → emitir sin proveedor rechazado con mensaje claro y la factura queda en ERROR → anular una factura no emitida rechazado).

### Módulos de negocio: todos implementados
Los 8 módulos definidos en `docs/requerimientos.md` ("Estado por módulo") tienen backend y frontend funcionando: Auth/Usuarios, Proveedores, Recepción y Calidad, Bodega, Ventas, Pagos, Facturación (sin conector real, ver arriba) y Reportes. No queda ningún scaffold vacío en `apps/api/src/modules`.

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
- **Módulo Ventas completo**:
  - `app/(dashboard)/ventas/page.tsx` — listado con montos formateados en COP.
  - `app/(dashboard)/ventas/nueva/page.tsx` — formulario con select de punto de compra + tipo de café (con stock disponible en vivo desde `/bodega/inventario`), comprador guardado opcional (autocompleta el nombre libre) o nombre escrito a mano, y un constructor de "lotes de origen" (selecciona recepciones del punto de compra elegido y les atribuye kg, con la suma en vivo vs. la cantidad total vendida).
  - `app/(dashboard)/ventas/[id]/page.tsx` — detalle de solo lectura con lotes de origen.
  - `app/(dashboard)/ventas/compradores/page.tsx` — alta y listado de compradores, activar/desactivar (mismo patrón que puntos de compra).
  - Nuevo ítem de navegación "Ventas" en el layout del dashboard.
- **Módulo Reportes completo**: `app/(dashboard)/reportes/page.tsx` — filtros de punto de compra/rango de fechas aplicados con un botón explícito (no en cada tecleo, a propósito), tarjetas KPI (comprado/vendido/margen), desglose de compras y ventas por tipo de café, calidad promedio, tabla de inventario actual, tabla de saldo pendiente por proveedor con total, y botón de exportar CSV que dispara una descarga real del navegador (`fetch` + `Blob` + link temporal, ya que el cliente `api.ts` genérico solo maneja JSON).
- **Módulo Facturación completo**:
  - `app/(dashboard)/facturacion/page.tsx` — listado con aviso permanente de que no hay proveedor tecnológico conectado.
  - `app/(dashboard)/facturacion/nueva/page.tsx` — genera el registro para una recepción; el select solo ofrece recepciones sin factura (filtrado en el cliente cruzando `/recepcion` con `/facturacion`, el backend igual rechaza duplicados si se cuela alguna).
  - `app/(dashboard)/facturacion/[id]/page.tsx` — detalle con botón "Emitir factura" (visible si `PENDIENTE`/`ERROR`, muestra el error del backend tal cual cuando falla) y formulario "Anular" (visible solo si `EMITIDA`).
- `packages/shared-types` ampliado con `PuntoCompra`, `DefectoTipo`, `TablaPrecioTramo`, `AnalisisCalidad`, `DefectoAnalisis`, `Recepcion`, `CategoriaDefecto`, `EstadoProcesoSecado`, `InventarioItem`, `ProcesoSecado`, `TrillaProceso`, `Anticipo`, `AnticipoDetalle`, `Pago`, `ConciliacionAnticipo`, `EstadoCuentaProveedor`, `EstadoTenant`, `Plan`, `PlatformTenant`, `Role`, `RolePermissionEntry`, `User`, `UserRoleAssignment`, `TenantSelf`, `Comprador`, `Venta`, `VentaLoteOrigenItem`, `ReportesDashboard`, `ReportesCompraPorTipo`, `ReportesVentaPorTipo`, `ReportesSaldoProveedor`, `ProveedorTecnologicoFacturacion`, `Factura`.

### Pendiente
- Ningún módulo queda como placeholder — los 8 tienen pantallas reales.
- `register` ya no es placeholder — ver sección "Landing page pública + autorregistro con aprobación" más arriba (sesión 2026-07-10) para el estado actual.
- El refresh automático de token y el resto de detalles de sesión están documentados en la sección "Exportar Excel en Reportes + sesión más larga" más arriba (sesión 2026-07-10) — esta línea quedaba desactualizada de antes de ese arreglo.
- No se probó visualmente en un navegador real en ninguna sesión (no hay herramienta de automatización de navegador disponible) — se verificó con `next build`/`next lint` limpios, todas las rutas devolviendo 200, y las formas de datos del frontend confirmadas contra las respuestas reales de la API vía curl.
- Recepción: no hay impresión/PDF del recibo, ni edición/anulación de una recepción ya creada (ver nota de alcance en la sección de backend).
- Bodega/secado "nuevo": la lista de recepciones mojado disponibles no excluye del todo las que ya fueron usadas en otro proceso (el backend sí lo valida y rechaza con mensaje claro, pero la UI no las oculta de antemano).
- Pagos: no hay página de detalle de un pago individual (la lista ya muestra proveedor/recepción/método/monto, que cubre el caso de uso principal); tampoco hay filtros de fecha/proveedor en la UI de listados (el backend sí los soporta vía query params).
- Ventas: el selector de "lotes de origen" en `/ventas/nueva` lista todas las recepciones del punto de compra sin filtrar por tipo de café ni excluir las agotadas (la trazabilidad es informativa por diseño, ver nota de alcance en la sección de backend, pero la UI podría guiar mejor la selección).
- Reportes: el "margen bruto del período" es simple (total vendido − total comprado en el rango de fechas), **no es rentabilidad por lote** — no hay todavía un reporte que cruce `VentaLoteOrigen` con el `valorTotal` de la recepción de origen para ver el margen de un lote específico. Es factible con los datos que ya existen (`Recepcion.valorTotal` vs. la porción de `Venta.valorTotal` atribuible via `VentaLoteOrigen.cantidadKgAtribuida`), pero no se construyó en esta pasada.
- Facturación: **sin conector real** (Factus/Siigo) — decisión explícita del usuario, "que quede lista solo si en algún momento se quiere conectar". El ciclo crear→emitir→anular funciona de punta a punta a nivel de datos/estado, pero `emitir` siempre falla hasta que alguien implemente un provider real (ver sección de backend). Tampoco hay CRUD de `ResolucionFacturacion` (rango de numeración DIAN) — se construye junto con el conector real, no aporta nada antes.

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
3. **Los 8 módulos de negocio del MVP original ya están implementados** (backend + frontend). No hay "siguiente módulo" obvio; las opciones para la próxima sesión son:
   - **Conectar un proveedor real de facturación** (Factus o Siigo) el día que el usuario decida cuál — implementar `FacturacionProviderAdapter` en `src/modules/facturacion/adapters/`, registrarlo en `FacturacionModule` y en el `switch` de `facturacion-provider.factory.ts`. Probablemente también haga falta el CRUD de `ResolucionFacturacion` en ese momento (rango de numeración DIAN, hoy no existe).
   - **QA visual en navegador real** — nunca se ha hecho en ninguna sesión (sin herramienta de automatización disponible en este entorno). Repasar cada módulo a mano sería el mayor salto de confianza posible en este punto.
   - **Rentabilidad por lote** en Reportes (ver nota en "Pendiente" de esa sección) — cruzar `VentaLoteOrigen` con `Recepcion.valorTotal`.
   - Cualquiera de las mejoras menores listadas en las secciones "Pendiente" de cada módulo (edición de recepciones, PDF de recibo, filtros de fecha en listados de Pagos, etc.) — ninguna es bloqueante, son pulido.
   - O lo que el usuario pida directamente; a estas alturas el sistema es funcional de punta a punta (compra → bodega → venta → pago → reporte), así que el trabajo que sigue es más sobre necesidades reales del negocio que sobre huecos del MVP.
4. Al terminar una sesión de trabajo, actualizar este archivo.
