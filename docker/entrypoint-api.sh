#!/bin/sh
# Entrypoint de la API en producción.
# 1) Aplica migraciones pendientes (idempotente, seguro en cada arranque).
# 2) Siembra datos base: catálogo de defectos de café y, si se dieron
#    credenciales PLATFORM_ADMIN_*, el super-admin de plataforma (upsert).
# 3) Arranca el servidor Nest ya compilado.
set -e

echo "==> [1/3] Aplicando migraciones (prisma migrate deploy)..."
node_modules/.bin/prisma migrate deploy

echo "==> [2/3] Sembrando datos base (defectos + platform admin)..."
# Usamos el seed YA COMPILADO (nest build genera dist/prisma/seed.js), así no
# dependemos de ts-node en runtime. Es idempotente (upsert). Si fallara, no
# tumbamos el arranque: se puede re-ejecutar manualmente.
node dist/prisma/seed.js || echo "WARN: el seed falló o se omitió; continúo con el arranque."

echo "==> [3/3] Iniciando API en el puerto ${PORT:-3001}..."
exec node dist/src/main.js
