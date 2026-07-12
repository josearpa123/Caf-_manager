# Despliegue de Coffee Manager en Oracle Cloud (piloto gratis)

Guía para poner Coffee Manager a funcionar 24/7 en una máquina virtual **Oracle Cloud "Always Free"** (gratis para siempre), lista para una prueba piloto con usuarios reales.

> **Por qué Oracle Always Free:** te da una VM ARM Ampere con hasta **4 vCPU y 24 GB de RAM sin costo permanente** — suficiente para todo el stack (web + API + PostgreSQL) con Docker. No pide tarjeta con cobro para el tier gratuito de por vida.

---

## 0. Arquitectura del despliegue

```
Internet ──▶ VM Oracle (Ubuntu + Docker)
                 ├─ web   (Next.js)  :3000
                 ├─ api   (NestJS)   :3001
                 └─ postgres         (interno, sin puerto público)
```

- El **frontend** (web) llama a la **API** desde el navegador del usuario, por eso la variable `NEXT_PUBLIC_API_URL` debe apuntar al host **público** de la API (IP o dominio), no a `localhost`.
- **PostgreSQL** no se expone a internet: solo lo ve la API dentro de la red de Docker.
- Las **migraciones** y el **seed** (catálogo de defectos + super-admin) se aplican solos en cada arranque de la API.

---

## 1. Crear la VM en Oracle Cloud

1. Crea una cuenta en <https://www.oracle.com/cloud/free/> y entra a la consola.
2. **Compute → Instances → Create Instance.**
3. Configura:
   - **Image:** Ubuntu 22.04 (o 24.04).
   - **Shape:** `VM.Standard.A1.Flex` (ARM, Always Free). Asigna **2 OCPU / 12 GB** (dentro del límite gratis; puedes subir a 4/24).
   - **SSH keys:** sube tu clave pública (o descarga la que Oracle genera). La necesitarás para entrar.
   - **Networking:** deja que cree una VCN nueva con subred pública y **IP pública**.
4. Crea la instancia y anota la **IP pública** (la llamaremos `<IP>`).

> Si el shape ARM aparece "out of capacity", reintenta a otra hora o elige otra *Availability Domain*; es común en el tier gratuito.

---

## 2. Abrir los puertos

Oracle bloquea todo salvo SSH por defecto. Hay que abrir en **dos** sitios.

### 2a. Security List (consola de Oracle)
En **Networking → Virtual Cloud Networks → tu VCN → Subnet → Security List → Add Ingress Rules**, agrega reglas *Ingress* (Source `0.0.0.0/0`, IP Protocol TCP):

| Puerto | Para qué |
|--------|----------|
| 3000 | Frontend (web) |
| 3001 | API |
| 80 y 443 | Solo si vas a usar HTTPS con dominio (sección 8) |

### 2b. Firewall dentro de la VM
Ubuntu en Oracle trae `iptables` cerrado. Conéctate por SSH y abre los puertos:

```bash
ssh ubuntu@<IP>

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3001 -j ACCEPT
# Solo si vas a usar HTTPS con dominio:
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Hacer las reglas permanentes:
sudo netfilter-persistent save   # si falta: sudo apt install -y iptables-persistent
```

---

## 3. Instalar Docker y Git en la VM

```bash
# Docker (script oficial)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Cierra la sesión SSH y vuelve a entrar para que aplique el grupo docker.
exit
ssh ubuntu@<IP>

# Verifica
docker --version
docker compose version
sudo apt install -y git
```

---

## 4. Traer el código a la VM

El repo está en GitHub (`josearpa123/Caf-_manager`). Como es privado, clónalo con un **token de acceso personal** de GitHub (Settings → Developer settings → Personal access tokens → *Fine-grained*, permiso de solo lectura al repo):

```bash
git clone https://<TU_TOKEN>@github.com/josearpa123/Caf-_manager.git
cd Caf-_manager
```

> **Alternativa sin token** (subir desde tu PC): desde tu máquina local, en la carpeta del proyecto:
> ```bash
> rsync -avz --exclude node_modules --exclude .next --exclude dist \
>   ./ ubuntu@<IP>:~/Caf-_manager/
> ```

---

## 5. Configurar las variables de producción

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Rellena **todos** los valores. Genera secretos fuertes con `openssl rand -base64 32`. Lo crítico:

- `POSTGRES_PASSWORD` → una clave larga aleatoria.
- `JWT_ACCESS_SECRET`, `JWT_PLATFORM_SECRET` → un `openssl rand -base64 32` distinto cada uno.
- `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` → tu super-admin para aprobar tenants.
- `NEXT_PUBLIC_API_URL` → **sin dominio, usa** `http://<IP>:3001` (pon la IP real de tu VM).

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

---

## 6. Desplegar

```bash
./deploy.sh
```

Esto construye las imágenes, aplica migraciones, siembra los datos base y levanta todo. La **primera** construcción tarda varios minutos (compila web y API).

Comprueba:

```bash
# Logs de la API (deberías ver "migrate deploy" y "Seed: ... listos")
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml logs -f api
```

Abre en el navegador:

- **App / tenants:** `http://<IP>:3000`
- **Panel de plataforma:** `http://<IP>:3000/platform/login`

---

## 7. Primer uso (crear el primer cliente del piloto)

1. Entra a **`http://<IP>:3000/platform/login`** con `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`.
2. Pídele al usuario piloto que se **registre** desde la landing (`http://<IP>:3000`) → queda en estado **PENDIENTE**.
3. En el panel de plataforma → **Solicitudes**, asígnale un **plan** y **Aprueba**.
4. Ya puede iniciar sesión en `http://<IP>:3000/login` con el correo/clave que registró (rol Administrador con todos los permisos de su tenant).

---

## 8. (Opcional) HTTPS gratis con dominio

Servir por HTTP simple sirve para probar, pero para un login financiero conviene HTTPS. Es gratis con un dominio de **DuckDNS** + **Caddy** (certificado Let's Encrypt automático).

1. En <https://www.duckdns.org> (login con Google/GitHub) crea, por ejemplo, `tucafe` → te da `tucafe.duckdns.org`. Apunta el dominio a `<IP>`. Crea dos subdominios apuntando a la misma IP: uno para la app y otro para la API (DuckDNS permite `algo.tucafe.duckdns.org` como TXT/registro, o usa dos dominios duckdns separados: `tucafe` y `apicafe`).
2. Abre los puertos **80 y 443** (sección 2, ambos sitios).
3. En `.env.prod` agrega/ajusta:
   ```
   APP_DOMAIN=tucafe.duckdns.org
   API_DOMAIN=apicafe.duckdns.org
   NEXT_PUBLIC_API_URL=https://apicafe.duckdns.org
   ```
4. Levanta con el overlay de Caddy:
   ```bash
   docker compose --env-file .env.prod \
     -f docker/docker-compose.prod.yml -f docker/docker-compose.tls.yml \
     up -d --build
   ```
   Caddy pedirá los certificados solo. Entra a `https://tucafe.duckdns.org`.

---

## 9. Actualizar el despliegue (nueva versión)

```bash
cd ~/Caf-_manager
git pull            # o vuelve a hacer rsync desde tu PC
./deploy.sh         # reconstruye y reinicia; las migraciones se aplican solas
```

> Si cambiaste `NEXT_PUBLIC_API_URL`, el `--build` de `deploy.sh` ya re-hornea el frontend.

---

## 10. Backups de la base de datos

Respaldo manual (guárdalo fuera de la VM):

```bash
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml \
  exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
```

Restaurar:

```bash
cat backup_2026-07-12.sql | docker compose --env-file .env.prod \
  -f docker/docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Para automatizarlo, agrega un `cron` diario que corra el `pg_dump`.

---

## 11. Comandos útiles / troubleshooting

```bash
# Ver estado
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml ps

# Logs de un servicio
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml logs -f web
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml logs -f api

# Reiniciar todo
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml restart

# Re-ejecutar el seed manualmente (defectos + platform admin)
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml \
  exec api node_modules/.bin/prisma db seed

# Bajar todo (sin borrar datos)
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml down
```

**"La web carga pero no puede iniciar sesión / no llama a la API":** casi siempre `NEXT_PUBLIC_API_URL` quedó en `localhost` o con una IP/puerto que no abre. Corrígelo en `.env.prod` y vuelve a correr `./deploy.sh` (se re-hornea el front).

**"No abre en el navegador":** revisa que abriste el puerto en **los dos** sitios (Security List de Oracle **y** `iptables` en la VM).

---

## 12. Checklist antes de invitar usuarios reales

- [ ] `.env.prod` sin ningún valor `CAMBIA...` y con secretos generados por `openssl`.
- [ ] Cambiaste la contraseña del super-admin de plataforma.
- [ ] Puerto de Postgres **no** publicado (así está en el compose; no lo abras).
- [ ] Un backup probado (`pg_dump`) y, ojalá, un cron diario.
- [ ] (Recomendado) HTTPS activo si van a manejar datos reales (sección 8).
- [ ] Sabes que este es un **piloto**: el proyecto aún tiene cobertura de tests mínima y no envía correos de notificación (las aprobaciones se avisan a mano).
