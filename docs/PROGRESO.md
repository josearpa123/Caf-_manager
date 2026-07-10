# Bitácora de Avance del Proyecto

> Este archivo se actualiza al final de cada sesión de trabajo relevante. Es lo primero que hay que leer al retomar el proyecto (junto con `docs/requerimientos.md` para decisiones de diseño ya tomadas).

**Última actualización:** 2026-07-09

## Fase actual (según cronograma en `docs/doc.md` §7.2)

**FASE 2: Desarrollo del MVP — Sprint 1-2**

Terminado: módulo de autenticación y usuarios (backend+infra), módulo de Proveedores completo (backend + frontend), fix de bugs estructurales que bloqueaban TODO módulo tenant-scoped.
Siguiente: módulo de Recepción de café (backend + frontend) — es el siguiente ítem del Sprint 1-2 en `docs/doc.md`.

## Fase 1 — Planificación y Diseño: COMPLETA

- Documento de negocio (`docs/doc.md`) y decisiones de arquitectura (`docs/requerimientos.md`) cerrados.
- Schema de Prisma completo (`apps/api/prisma/schema.prisma`, 885 líneas).
- Migración inicial aplicada: `apps/api/prisma/migrations/20260709213548_init_schema`.

## Fixes estructurales de esta sesión (importante para entender el estado real)

Antes de esta sesión, **ningún módulo tenant-scoped había sido probado end-to-end** — compilaban pero nunca corrieron con guards activos. Se encontraron y corrigieron 3 bugs reales:

1. **Guards nunca registrados globalmente**: `JwtAuthGuard`/`PermissionsGuard` existían pero no estaban wireados en ningún lado (`apps/api/src/app.module.ts` ahora los registra vía `APP_GUARD`).
2. **Errores de tipos de Prisma preexistentes** que rompían `pnpm build` (`users.service.ts`, `roles.service.ts`, `tenants.service.ts`, `puntos-compra.service.ts`, `configuracion.service.ts`): faltaba `import type` para `TenantPrismaClient` y `tenantId` explícito en los `create`. Corregido en todos, y el patrón (`tenantId` como parámetro explícito desde `@CurrentUser('tenantId')`) es el que hay que seguir en módulos nuevos.
3. **Bug estructural de NestJS** (el más serio): el provider `TENANT_PRISMA` (request-scoped) se instanciaba **antes** de que corrieran los guards (`loadPerContext` ocurre antes del pipeline de guards — ver `router-explorer.js` de `@nestjs/core`), así que leer `request.user` ahí siempre fallaba. Se corrigió en `apps/api/src/prisma/tenant-prisma.provider.ts`: ahora verifica el JWT de forma independiente (con `JwtService.verify`) en vez de depender de que el guard ya haya poblado `request.user`. Este bug afectaba a **todos** los módulos tenant-scoped (users, tenants, puntos-compra, proveedores), no solo el nuevo.
4. **Fuga de seguridad encontrada al probar**: `UsersService` devolvía `passwordHash` (bcrypt) en las respuestas de `/users`. Corregido usando `select` explícito en vez de `include`.

Todo esto se verificó con un flujo real end-to-end (docker compose postgres, migración, seed, creación de tenant vía `/platform`, login, CRUD de proveedores, aislamiento entre tenants, y un caso negativo de permisos con 403) — no solo compilación.

## Backend (`apps/api` — NestJS + Prisma)

### Implementado
- Multi-tenancy: extensión de Prisma con scoping automático por `tenantId` (`src/prisma/extensions/tenant-scoping.extension.ts`).
- **Auth**: login + refresh token JWT (`src/modules/auth`).
- **Users + Roles**: CRUD de usuarios, roles con permisos granulares M2M (`src/modules/users`). Ya no filtra `passwordHash`.
- **Platform**: panel de super-admin, creación manual de tenants (`src/modules/platform`).
- **Tenants**: configuración de empresa (NIT, resolución DIAN) y puntos de compra (`src/modules/tenants`).
- **Proveedores**: CRUD completo (`src/modules/proveedores`) — crear/listar/buscar/filtrar/editar/desactivar/reactivar, con validación de duplicados (tipo+número de identificación) y `createdById` de auditoría.
- **Audit log**: registro de cambios en módulos sensibles (`src/common/audit`).
- Guards: `JwtAuthGuard`, `PermissionsGuard`, `PlatformAuthGuard` — ahora sí registrados globalmente y verificados funcionando.

### Pendiente (scaffold vacío — controller/service/module creados pero SIN lógica de negocio)
- `recepcion` — recepción de café + cálculo de calidad/precio ⬅ **siguiente a implementar**
- `calidad`
- `bodega` — conversión mojado→seco→almendra, pasilla
- `pagos`
- `facturacion` — adaptador DIAN (Factus/Siigo, decisión de proveedor diferida)
- `ventas`
- `reportes` — dashboard y KPIs

## Frontend (`apps/web` — Next.js)

### Implementado
- Cliente API (`lib/api.ts`): fetch wrapper con token Bearer + manejo de errores.
- Autenticación (`lib/auth.tsx`): `AuthProvider`/`useAuth`, login real conectado a `POST /auth/login`, guardado de sesión en `localStorage`.
- Página de login real (`app/(auth)/login/page.tsx`) con react-hook-form + zod.
- Layout de dashboard protegido (`app/(dashboard)/layout.tsx`): redirige a `/login` si no hay sesión, nav con estado activo, botón de logout.
- Componentes UI base sin Radix (`components/ui/`: button, input, label, select, card).
- **Módulo Proveedores completo**: listado con búsqueda/filtro (`app/(dashboard)/proveedores/page.tsx`), alta (`.../nuevo`), edición (`.../[id]`), formulario compartido (`components/proveedores/proveedor-form.tsx`) validado con Zod desde `packages/validation-schemas`.
- `packages/shared-types` y `packages/validation-schemas` ahora se usan de verdad: enums (`TipoIdentificacion`), tipo `Proveedor`, y `proveedorSchema` compartido. Enlazados a `apps/web` como dependencias de workspace (`next.config.mjs` con `transpilePackages`).

### Pendiente
- El resto de páginas de dashboard siguen siendo placeholders ("Próximamente"): recepción, bodega, pagos, facturación, reportes, configuración.
- `register` sigue como placeholder — **correcto así**, el onboarding de tenants es manual por diseño (ver `requerimientos.md`), no hay registro self-service.
- No hay refresh automático de token (se guarda el refresh token pero no hay interceptor de renovación); por ahora si expira el access token (15 min) hay que volver a loguear.
- No se probó visualmente en un navegador real (no hay herramienta de automatización de navegador disponible en esta sesión) — se verificó con `next build`/`next lint` limpios, todas las rutas devolviendo 200, y las formas de datos exactas que consume el frontend confirmadas contra las respuestas reales de la API vía curl.

## Cómo levantar el entorno de desarrollo

```bash
docker compose -f docker/docker-compose.yml up -d postgres
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm --filter api build && node apps/api/dist/src/main   # o: pnpm --filter api start:dev
pnpm --filter web dev   # http://localhost:3000
```

Para crear el primer tenant de prueba: `POST /platform/auth/login` (con `PLATFORM_ADMIN_EMAIL`/`PASSWORD` del seed) y luego `POST /platform/tenants`.

## Cómo retomar en la próxima sesión

1. Leer este archivo.
2. Si hay dudas de diseño (reglas de negocio, campos obligatorios, etc.), revisar `docs/requerimientos.md` — ya están la mayoría resueltas ahí.
3. Continuar con: **implementar módulo de Recepción** (backend: `src/modules/recepcion/*` + frontend: `app/(dashboard)/recepcion/`), siguiendo el mismo patrón que Proveedores (DTOs con class-validator, service con `@InjectTenantPrisma`, `tenantId` explícito en creates, controller con `@RequirePermissions`). Recepción es más compleja: depende de Proveedores (ya listo) y de la tabla de precios por calidad (`TablaPrecioTramo`, aún sin UI de configuración — puede necesitarse antes o en paralelo).
4. Al terminar una sesión de trabajo, actualizar este archivo: mover lo completado de "Pendiente" a "Implementado" y ajustar "Fase actual" / "siguiente paso".
