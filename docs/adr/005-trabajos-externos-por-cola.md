# ADR-005 · Trabajos externos por cola (BullMQ), nunca dentro de la petición

**Estado:** Aceptada · 2026-09-30 · Origen: `docs/TECNICO.md` (hallazgo H6)

## Contexto
Redis está en el compose pero la API no lo usa. Generar PDFs, enviar WhatsApp o llamar a la DIAN dentro de la petición la hace lenta y frágil; el servidor solo puede gastar ~0,5 s en guardar una recepción.

## Decisión
Lo lento o externo se encola en BullMQ sobre Redis y lo procesa un worker en su propio contenedor, con reintentos. La petición HTTP solo escribe en la base y encola.

## Consecuencias
- Un servicio externo caído no bloquea al operador.
- Se agrega un contenedor (worker) y se usa Redis también para caché y límites de peticiones.
- Los trabajos deben ser idempotentes porque se reintentan (regla de dominio 9).
