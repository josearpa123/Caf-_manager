# ADR-008 · Búsqueda de proveedor con trigramas (`pg_trgm`) en un endpoint propio

**Estado:** Aceptada · 2026-10-01 · Origen: `docs/TECNICO.md` (RF-02, RNF-01, CU-01 flujo 2)

## Contexto
La recepción rápida necesita escoger al proveedor escribiendo parte de la cédula, el nombre o el apodo, con resultados en menos de 300 ms y tolerando errores de digitación. El listado actual (`GET /proveedores?q=`) usa `contains` insensible a mayúsculas, que no ordena por parecido ni tolera errores y recorre toda la tabla.

## Decisión
- Columna `Proveedor.apodo` (opcional) y extensión `pg_trgm`, con tres índices GIN `gin_trgm_ops` sobre `nombre`, `apodo` y `numeroIdentificacion` (migración `20261001130000_proveedor_apodo_busqueda`, aditiva). Los índices se declaran en `schema.prisma` (`type: Gin`, `ops: raw("gin_trgm_ops")`), así `prisma migrate diff` no detecta deriva en el CI.
- **Endpoint nuevo `GET /proveedores/buscar?q=&limit=`** en vez de cambiar el listado: la web actual consume el arreglo completo de `GET /proveedores`, y cambiar su forma la rompería. Devuelve como máximo `limit` (por defecto 10, tope 20) proveedores **activos** del tenant, con `id`, `nombre`, `apodo`, documento, teléfono, municipio y `ultimoTipoCafe` (valor por defecto del formulario, CU-01 paso 3).
- Coincide, sin tildes ni mayúsculas, por `ILIKE '%texto%'` o por similitud (`%`) en nombre y apodo. Orden: primero la cédula que empieza igual, luego el mayor `similarity`, luego el nombre. Los comodines `%`, `_` y `\` escritos por el usuario se escapan.
- SQL explícito con el `tenantId` del JWT (como `siguienteConsecutivo`), nunca del cliente.
- **Es un top-N acotado, no un listado**, por eso no lleva cursor (regla de dominio 10 aplica a los listados, que siguen en `GET /proveedores`).

## Consecuencias
- Medido con 5.000 proveedores en un solo tenant: 9–18 ms en el servidor (meta 300 ms). A esa escala el planificador usa el índice por `tenantId` y no los de trigramas; estos pesan cuando un tenant crezca (decenas de miles) y cuestan algo en escrituras. Revisar con `EXPLAIN` al superar ~50.000 proveedores por tenant.
- Los índices no incluyen `tenantId` (haría falta `btree_gin`, otra extensión); el filtro por tenant lo resuelve el índice `Proveedor_tenantId_idx`.
- Se usa la extensión `unaccent` (migración `20261001140000_unaccent`): "Jose" encuentra "José" y al revés. Como `unaccent()` envuelve las columnas, esas comparaciones no pueden usar los índices GIN creados sobre la columna cruda (un índice por expresión exige SQL a mano que `prisma migrate diff` marcaría como deriva en el CI). A la escala medida no importa (el índice por tenant hace el trabajo); al revisar con `EXPLAIN` en tenants muy grandes, evaluar índices por expresión con un wrapper inmutable de `unaccent`.
- `GET /proveedores?q=` ahora también busca por apodo.
- Probado con PostgreSQL real (`apps/api/test/proveedores-busqueda.int-spec.ts`): parcial, apodo, cédula, errores de digitación, orden, aislamiento por tenant, comodines y rendimiento.
