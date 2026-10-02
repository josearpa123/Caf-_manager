# ADR-009 · Zona horaria fija de Colombia y retención en la fuente opcional con parámetros por fecha

**Estado:** Aceptada · 2026-10-01 · Origen: `docs/TECNICO.md` (H5, RF-09, CU-03, regla de dominio 7) y decisiones del usuario del 2026-10-01

## Contexto
1. El "día" se calculaba en UTC. Desde las 7 p. m. hora Colombia el día UTC ya es el siguiente: la búsqueda de la tabla de precios (columna `@db.Date`) no encontraba tramo y no se podía registrar pergamino por la noche. El año del consecutivo tenía el mismo problema el 31 de diciembre.
2. La retención en la fuente depende de la UVT del año y de reglas tributarias que cambian; no puede quedar en el código (regla 7) ni aplicarse a quien no es agente de retención.

## Decisión
**Zona horaria.** Una constante para toda la plataforma: `America/Bogota`, UTC-5 sin horario de verano (`apps/api/src/common/fecha-colombia.ts`: `diaColombia`, `isoDiaColombia`, `anioColombia`). Se usa en la búsqueda del tramo de precios (guardado, vista previa y listado "del día"), en el año del consecutivo y en la búsqueda del parámetro tributario. Si algún día hay otro país, pasa a una columna por tenant.

**Retención.**
- Es **opcional por negocio**: `ConfiguracionTenant.esAgenteRetencion` (por defecto `false`), que el comprador activa en Configuración. Si no es agente, nunca se retiene.
- **Solo por recepción** (no acumula por proveedor ni por mes): si el valor total es **igual o superior** a la base mínima (`umbralUvt × valorUvt`), retención = valor total × tarifa, a centavos con la mitad hacia arriba. Todo en `Decimal` (`Prisma.Decimal`), nunca `number` (regla 1). Código: `apps/api/src/modules/recepcion/retencion.ts`.
- Aplica a recepciones de **pergamino y mojado**; la **pasilla no** (subproducto de la trilla, no es pergamino). Interpretación a confirmar con el contador; se cambia en `TIPOS_CON_RETENCION`.
- Parámetros en la tabla global `ParametroTributario` (`concepto`, `vigenteDesde`, `valorUvt`, `umbralUvt`, `tarifa`, `norma`); se usa la fila más reciente con `vigenteDesde <=` el día de Colombia de la recepción. Si el negocio es agente y no hay ninguna fila, la recepción se rechaza con 400 en vez de inventar un valor.
- `baseRetencion`, `tarifaRetencion`, `valorRetencion` y `netoPagar` se copian en la recepción y no cambian después (regla 3). Las recepciones anteriores se rellenaron con retención 0 y neto = valor total.
- **Valores sembrados** (verificados el 2026-10-01 con dos fuentes independientes, sin usar memoria): UVT 2026 = **$52.374** (Resolución DIAN 000238 del 15-dic-2025); compras de café pergamino o cereza: **0,5 %** desde **70 UVT** (= $3.666.180) según el Decreto 1625 de 2016 y la tabla de retención 2026; el Decreto 572 de 2025, vigente desde el 1-jul-2026, no cambió esa fila.

## Consecuencias
- **Tarea anual**: cada diciembre/enero cargar una fila de `ParametroTributario` con la UVT del año siguiente. Sin ella, 2027 usaría la UVT de 2026 (la fila más reciente vigente) hasta que se cargue.
- Los reportes agrupan por día/mes/semana en UTC (`reportes.service.ts`); una compra de las 8 p. m. cuenta para el día siguiente. Pendiente de migrar a `diaColombia`.
- `ParametroTributario` no tiene `tenantId` (es de la plataforma); no entra a `TENANT_SCOPED_MODELS`. Falta una pantalla de super-admin para mantenerla; por ahora se inserta con SQL o migración.
- El redondeo de la retención por transacción es a centavos; la aproximación al múltiplo de mil que exige la declaración se hace al declarar, no por recepción (confirmar con el contador).
- La tarifa y la base de otros conceptos (servicios, compras generales) no se modelan: solo `RETENCION_COMPRA_CAFE`.
