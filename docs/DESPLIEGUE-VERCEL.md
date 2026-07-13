# Despliegue de Coffee Manager: Vercel + Render + Neon (gratis)

Guía por paneles (sin terminal ni servidores que administrar). Reparte las 3 piezas del proyecto en 3 servicios gratuitos:

```
  web (Next.js)   ──▶  Vercel     (HTTPS y URL automáticos)
  api (NestJS)    ──▶  Render     (corre el Dockerfile ya listo)
  base de datos   ──▶  Neon       (PostgreSQL administrado)
```

> **Prerrequisito:** el código debe estar en GitHub (repo `josearpa123/Caf-_manager`, rama `main`) — ya lo está. Vercel y Render construyen desde ahí. Cada vez que hagas `git push`, se redepliegan solos.

Haz los pasos **en este orden**: primero la base (Neon), luego la API (Render), al final la web (Vercel), porque cada uno necesita la URL del anterior.

---

## Paso 1 · Base de datos en Neon

1. Entra a <https://neon.tech> → **Sign up** (con GitHub).
2. **Create project**: ponle un nombre (ej. `coffee-manager`), región **AWS us-east-1** (cercana a Colombia). Crear.
3. Neon te muestra el **Connection string**. Cópialo. Se ve así:
   ```
   postgresql://usuario:clave@ep-cosa-1234.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   > Si aparece un botón/interruptor **"Pooled connection"**, déjalo **apagado** y copia la conexión **directa** (sin `-pooler` en el host). Es más segura para las migraciones.
4. Guarda ese texto: es tu `DATABASE_URL` para el Paso 2.

---

## Paso 2 · API en Render (con Docker)

1. Entra a <https://render.com> → **Sign up** (con GitHub).
2. **New +** → **Web Service** → conecta y elige el repo **`Caf-_manager`**.
3. Configura:
   - **Name:** `coffee-api`
   - **Language / Runtime:** **Docker**
   - **Branch:** `main`
   - **Dockerfile Path:** `docker/Dockerfile.api`
   - **Root Directory:** *(déjalo vacío)* — el contexto debe ser la raíz del repo.
   - **Instance Type:** **Free**
4. Abre **Advanced → Environment Variables** y agrega:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *(el connection string de Neon del Paso 1)* |
   | `JWT_ACCESS_SECRET` | `tSDmM2a0YtUHdFQ/KbmiUyCCWpbGuEN/aaT6SYGuIpQ=` |
   | `JWT_PLATFORM_SECRET` | `bGAxAlvU2gSHqj/aiIdDI8J9utNL8mGiXnW9jYZzZVo=` |
   | `PLATFORM_ADMIN_EMAIL` | *(tu correo, ej. `frankpalma0605@gmail.com`)* |
   | `PLATFORM_ADMIN_PASSWORD` | *(una clave fuerte que elijas)* |
   | `PLATFORM_ADMIN_NOMBRE` | *(tu nombre)* |

   > **No** agregues `PORT`: Render lo inyecta solo y la API ya lo usa. Los `JWT_*_EXPIRES_IN` tienen valores por defecto, no hace falta ponerlos.
5. **Create Web Service.** Render construye la imagen (varios minutos). En el primer arranque, la API **aplica las migraciones y siembra los datos** sola contra Neon (lo verás en los logs: "prisma migrate deploy", "Seed: ... listos").
6. Cuando quede *Live*, copia su URL, algo como **`https://coffee-api.onrender.com`**.
7. Comprueba: abre `https://coffee-api.onrender.com/registro/planes` en el navegador → debe devolver un JSON (lista de planes).

---

## Paso 3 · Web en Vercel

1. Entra a <https://vercel.com> → **Sign up** (con GitHub).
2. **Add New… → Project** → importa el repo **`Caf-_manager`**.
3. Configura:
   - **Framework Preset:** Next.js *(se detecta solo)*.
   - **Root Directory:** haz clic en **Edit** y elige **`apps/web`**.
   - Install/Build command: **déjalos por defecto** (Vercel detecta el monorepo pnpm).
4. Abre **Environment Variables** y agrega:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | *(la URL de Render del Paso 2, ej. `https://coffee-api.onrender.com`)* |

   > Esta variable se **hornea en el build**, por eso hay que ponerla **antes** de desplegar. Si la cambias luego, hay que volver a desplegar la web.
5. **Deploy.** Al terminar te da la URL pública, ej. **`https://caf-manager.vercel.app`**.

---

## Paso 4 · Primer uso

1. Entra a **`https://<tu-web>.vercel.app/platform/login`** con el `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` que pusiste en Render.
2. Pídele al usuario piloto que se **registre** desde la landing → queda **PENDIENTE**.
3. En el panel de plataforma → **Solicitudes**, asígnale un **plan** y **Aprueba**.
4. Ya puede entrar en **`/login`** con su correo y clave.

---

## Cosas que debes saber (plan gratis)

- **Render free "duerme" la API** tras ~15 min sin uso. La primera visita después la despierta y tarda ~50 segundos; luego va normal. Para un piloto está bien.
- **Redespliegue automático:** cada `git push` a `main` reconstruye Vercel y Render. No tienes que hacer nada más.
- **CORS ya está abierto** en la API, así que la web de Vercel puede llamarla sin configurar nada extra.
- **Costo:** $0 en los tres. Neon y Vercel son gratis permanentes; Render free sirve para pilotos (con el "sleep" mencionado).

## Si algo falla

- **La web carga pero no inicia sesión:** casi siempre `NEXT_PUBLIC_API_URL` en Vercel quedó mal o la API de Render está "dormida"/caída. Abre la URL de Render directo para despertarla y revisa que la variable tenga exactamente la URL de Render (con `https://`, sin barra al final).
- **Render falla al construir o migrar:** revisa los **Logs** del servicio en Render. El error más común es un `DATABASE_URL` mal copiado desde Neon.
- **Vercel falla en build por versión de pnpm/Node:** en el proyecto de Vercel, **Settings → Node.js Version → 22.x**.
