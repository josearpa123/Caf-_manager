# Coffee Manager

SaaS de gestión para compradores de café pergamino en Colombia. Ver `docs/doc.md` para el documento de proyecto completo y `docs/requerimientos.md` para los requerimientos técnicos en definición.

## Estructura

```
apps/
  web/      Frontend Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui)
  api/      Backend NestJS (TypeScript, Prisma, PostgreSQL)
packages/
  shared-types/         Tipos TypeScript compartidos entre web y api
  validation-schemas/   Esquemas Zod compartidos
  eslint-config/         Configuración de lint compartida
docker/     docker-compose y Dockerfiles para desarrollo y producción
docs/       Documentación de proyecto y requerimientos
```

Monorepo gestionado con **pnpm workspaces** + **Turborepo**.

## Requisitos

- Node.js 20+ (recomendado 22)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker + Docker Compose

## Desarrollo local

1. Instalar dependencias:

   ```bash
   pnpm install
   ```

2. Copiar variables de entorno:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.local.example apps/web/.env.local
   ```

3. Levantar PostgreSQL y Redis:

   ```bash
   docker compose -f docker/docker-compose.yml up -d postgres redis
   ```

4. Generar el cliente de Prisma y aplicar migraciones:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

5. Levantar frontend y backend en modo desarrollo:

   ```bash
   pnpm dev
   ```

   - Web: http://localhost:3000
   - API: http://localhost:3001

## Scripts principales (raíz)

| Script            | Descripción                                  |
| ------------------ | --------------------------------------------- |
| `pnpm dev`         | Levanta web + api en modo watch (turbo)       |
| `pnpm build`       | Build de producción de todos los paquetes/apps |
| `pnpm lint`        | Lint de todos los paquetes/apps                |
| `pnpm test`        | Tests de todos los paquetes/apps               |
| `pnpm db:generate` | Genera el cliente de Prisma                    |
| `pnpm db:migrate`  | Aplica migraciones de Prisma en desarrollo     |
| `pnpm db:seed`     | Ejecuta el seed de la base de datos            |

## Estado del proyecto

Scaffold inicial: estructura de carpetas, configuración de monorepo, módulos backend vacíos y rutas frontend placeholder. El modelo de datos (Prisma) y la lógica de negocio de cada módulo se definirán en la siguiente fase (ver `docs/requerimientos.md`).
