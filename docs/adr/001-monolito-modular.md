# ADR-001 · Monolito modular en lugar de microservicios

**Estado:** Aceptada · 2026-09-30 · Origen: `docs/TECNICO.md` (Arquitectura y despliegue)

## Contexto
Coffee Manager lo desarrolla una sola persona con ~7 h/semana, para 100 tenants y 50 recepciones/min como meta (RNF-09). La API ya está organizada en 15 módulos NestJS por dominio.

## Decisión
Se mantiene una única API NestJS con módulos por dominio, desplegada en un solo servidor con cada pieza (Caddy, web, API, worker, Redis, PostgreSQL) en su propio contenedor. Lo lento o externo se separa en un worker con cola (ver ADR-005), no en microservicios.

## Consecuencias
- Menos costo operativo y de complejidad: un despliegue, una base, transacciones locales.
- La API debe ser sin estado (sesiones en JWT/DB, caché y límites en Redis) para poder correr varias copias detrás de Caddy.
- Los límites entre módulos deben respetarse en el código para poder extraer uno si una señal medida lo exige.
