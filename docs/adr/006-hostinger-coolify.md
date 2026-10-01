# ADR-006 · Hostinger KVM 2 con Coolify como plataforma de despliegue

**Estado:** Aceptada · 2026-09-30 · Origen: `docs/TECNICO.md` (sprint 3)

## Contexto
Hace falta un despliegue barato, portable y operable por una sola persona, con HTTPS, despliegue automático y backups. El sistema debe levantarse con `docker compose up` en cualquier servidor Linux (RNF-08).

## Decisión
Un VPS Hostinger KVM 2 con Coolify, que despliega `main` automáticamente, corre las migraciones antes de arrancar la nueva versión y guarda los secretos en sus variables de entorno. Caddy hace de punto de entrada HTTPS. Backups diarios de PostgreSQL cifrados y fuera del servidor, con restauración probada.

## Consecuencias
- Costo bajo y migrable a otro servidor sin tocar la app.
- Un solo servidor: RTO 4 h / RPO 24 h (RNF-04) dependen de los backups.
- Escalar es subir a KVM 4 o separar la base según las señales medidas (ver "Escalabilidad" en `TECNICO.md`).
