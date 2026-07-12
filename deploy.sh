#!/usr/bin/env bash
# Coffee Manager — despliegue/actualización de producción en un solo comando.
# Ejecuta desde la raíz del repo:  ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE=".env.prod"
COMPOSE_FILE="docker/docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no existe $ENV_FILE."
  echo "Crea uno con:  cp .env.prod.example .env.prod   y edita los valores."
  exit 1
fi

# Aviso si quedaron placeholders sin cambiar.
if grep -q "CAMBIA" "$ENV_FILE"; then
  echo "AVISO: $ENV_FILE todavía tiene valores 'CAMBIA...'. Edítalos antes de un piloto real."
  echo "Presiona Enter para continuar de todos modos, o Ctrl+C para abortar."
  read -r _
fi

echo "==> Construyendo imágenes y levantando servicios..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "==> Estado de los contenedores:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo
echo "Listo. Sigue los logs de la API con:"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f api"
