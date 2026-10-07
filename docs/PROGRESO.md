# Bitácora de Avance del Proyecto

> Este archivo se actualiza al final de cada sesión de trabajo relevante. Es lo primero que hay que leer al retomar el proyecto (junto con `docs/requerimientos.md` para decisiones de diseño ya tomadas).

**Última actualización:** 2026-10-06

## Sprint 2 · PR 3 — reportes en día de Colombia (sesión 2026-10-06)

Rama `fix/reportes-dia-colombia`. Cierra el pendiente "reportes agrupan en UTC" que dejó el PR de zona horaria (ADR-009).

- **Cubre**: H5 (zona horaria, parte de reportes), ADR-009. Ningún RF nuevo.
- **Qué cambió**: los filtros `desde`/`hasta` van de 00:00:00.000 a 23:59:59.999 hora de Bogotá (antes `desde` era medianoche UTC y `hasta` 23:59 UTC, así que una compra de las 8 p. m. contaba para el día siguiente). El agrupado por semana, mes y trimestre usa el día de Colombia (el 31-dic a las 8 p. m. sigue en diciembre). Las fechas del CSV y del Excel salen como día de Colombia. Nuevos `inicioDiaColombia`, `finDiaColombia` y `enHoraColombia` en `common/fecha-colombia.ts`; los períodos pasaron a `reportes/periodos.ts` para poder probarlos.
- **Sin migración**: no cambia el schema ni los datos guardados (siguen siendo instantes UTC).
- **Pruebas**: 9 unitarias nuevas (rangos, borde de las 5 a. m. UTC, 8 p. m. del 30-sep en septiembre, semana ISO 2026-W53) y 1 de integración con PostgreSQL real (dashboard y CSV: la compra de las 8 p. m. aparece en su día y no en el siguiente). API: 201 unitarias y 47 de integración.

### Pendiente / riesgos
- Fuera de reportes, `viajes.service.ts` también usa `toISOString()`; revisar si muestra fechas de calendario.
- `estadoCuenta` y reportes siguen sumando plata con `number` (regla 1): deuda anterior.
- Cómo probarlo a mano: crear una compra pasadas las 7 p. m. y ver que el reporte del día de hoy la incluya.

## Manual: cómo anular una recepción (sesión 2026-10-06)

Rama `docs/manual-anulacion`. Solo documentación de usuario, sin cambios de código.

- **Qué cambió**: `apps/web/content/manual.md`, sección "Si te equivocaste", ya no dice que anular no existe. Explica el botón **Anular**, el motivo (10 a 500 caracteres), qué se revierte y el bloqueo por secado, venta o falta de stock (RF-08).
- **Cubre**: RF-07, RF-08 (lado usuario). Pruebas: ninguna, es texto.
- **Pendiente / riesgos**: el texto sale de lo documentado en ADR-010 y no se recorrió a mano en el navegador. Falta la pantalla para revertir un secado o anular una venta. El manual sigue diciendo que no se puede pagar en el mismo paso de la compra (sigue siendo cierto).

## Sprint 2 · PR 2 — anulación de recepciones, cierra H4 (sesión 2026-10-03)

Rama `feat/anulacion-recepcion`. Decisiones del usuario: incluir RF-08 (bloquear si está en un secado, una trilla o una venta y decir cuál revertir primero) y revertir pagos y conciliaciones en la misma transacción y con idempotencia. Detalle en `docs/adr/010-anulacion-de-recepciones.md`.

- **Cubre**: H4, RF-07, RF-08, CU-02 (menos la nota de ajuste DIAN), reglas 2, 4 y 6.
- **Schema** (dos migraciones aditivas): `20261003000000_anulacion_recepcion_valores_enum` (permiso `RECEPCION_ANULAR` y origen de inventario `ANULACION_RECEPCION`, aparte porque PostgreSQL no deja usar un valor de enum en la misma transacción que lo crea) y `20261003000100_anulacion_recepcion` (`Recepcion.estado/anuladaAt/anuladaPorId/motivoAnulacion`, `Pago.anuladoAt/motivoAnulacion`, `ConciliacionAnticipo.anuladoAt`, índice `(tenantId, estado)` y el permiso para el rol Administrador de los negocios existentes). Sin deriva en `migrate diff`. El diccionario decía `fechaAnulacion`; el campo se llama `anuladaAt`, como el resto de marcas de tiempo.
- **API**: `POST /recepcion/:id/anular` (permiso `RECEPCION_ANULAR`, encabezado `Idempotency-Key`, cuerpo `{ motivo }` de 10 a 500 caracteres). En una transacción: candado de fila, validaciones de RF-08, salida compensatoria de inventario, pagos y conciliaciones marcados, recepción `ANULADA`. Responde con la recepción y cuántos pagos y conciliaciones se anularon. `GET /recepcion?estado=` filtra por estado.
- **RF-08**: 409 con el código del secado o la venta ("Revierte primero ese secado"). La trilla y la mezcla de pasilla no quedan ligadas a una recepción, así que se detectan por stock: si en bodega no queda lo que la recepción aportó, se bloquea.
- **Lo que ignora las anuladas**: estado de cuenta del proveedor, saldo de anticipos, reportes (dashboard, saldos, CSV y Excel), y no admiten pagos, conciliaciones, secado, venta de lotes, decisión de destino de pasilla ni factura.
- **Web**: botón "Anular" en el detalle de la recepción (solo con el permiso y si está activa) con diálogo de motivo y llave de idempotencia por motivo; aviso de anulada con fecha y motivo; insignia "Anulada" en el listado; `RECEPCION_ANULAR` en la pantalla de roles.
- **Pruebas**: 17 unitarias del servicio y del DTO; 7 de integración con PostgreSQL real (anulación completa con pagos, anticipos, ledger y auditoría; no pagar ni anular dos veces; bloqueo por secado; bloqueo por stock; misma llave = una sola anulación y otra llave distinta con otro cuerpo = 409; **carrera de dos anulaciones simultáneas: una gana, la otra 409, una sola salida de inventario**; aislamiento entre negocios). API: 187 unitarias y 46 de integración; build de API y web limpios.

### Pendiente / riesgos
- **No hay cómo revertir un secado ni anular una venta**: el mensaje de bloqueo los nombra pero el usuario no tiene pantalla para deshacerlos. Hay que construirlo.
- La nota de ajuste DIAN no se encola (no hay BullMQ hasta el Sprint 3); la respuesta trae `notaAjusteDianPendiente`.
- Sin pruebas propias aún para las guardas de secado, ventas, conciliaciones y reportes que ignoran anuladas (la de pagos y estado de cuenta sí está en integración).
- Ventana de carrera de la verificación por stock (ver ADR-010).
- No probado a mano en el navegador: falta recorrer anular desde la pantalla con datos reales.
- El manual de usuario (`apps/web/content/manual.md`, PR #12) debe decir cómo anular y dejar de decir que no existe; se actualiza cuando #12 llegue a `main`.
- `estadoCuenta` y reportes siguen sumando plata con `number` (regla 1): deuda anterior, no de este PR.

## Café seco por calidad o a precio por kilo (sesión 2026-10-01, tras revisar el sistema en local)

Comentario del usuario al revisar: no todos los compradores miden humedad y factor; muchos solo pagan un precio por kilo. También: el sistema se ve complejo, sobre todo el menú con tantos módulos, y quiere un manual al final.

- **Decisión (del usuario)**: opción del negocio + interruptor en cada compra.
- **Backend**: `POST /recepcion` acepta pergamino con `analisisCalidad` (precio de la tabla del día, como antes) **o** con `precioKg` (precio directo); ambos a la vez → 400. Nueva opción `ConfiguracionTenant.modoCompraPergamino` (`CALIDAD` por defecto | `PRECIO_DIRECTO`), migración `20261002120000_modo_compra_pergamino`, expuesta en `GET /recepcion/contexto` y `PATCH /tenants/me/configuracion`. El pergamino a precio directo no crea análisis ni usa tramo, entra al inventario de pergamino y retiene igual que el de calidad. Los reportes ya tomaban el análisis como opcional.
- **Web**: en café seco, interruptor "Por calidad / A precio por kilo" con el valor inicial de la configuración; en modo precio desaparecen humedad, muestra, almendra y factor. Configuración: grupo "Cuando compro café seco".
- **Pruebas**: 9 unitarias y 4 de validación del DTO, 1 de integración con PostgreSQL real; navegador (390 px): precio por kilo $18.000 × 100 kg = $1.800.000 (REC-2026-000024) y el interruptor por compra. API: 175 unitarias aprox. y 39 de integración.
- **Menú más simple** (el usuario marcó el menú con tantos módulos como lo más confuso): el menú se agrupa en **Comprar / Café / Administración** y el negocio puede **ocultar los módulos que no usa** (Configuración → "Qué quiero ver en el menú"). Nueva columna `ConfiguracionTenant.modulosOcultos` (migración `20261002130000_modulos_ocultos`), `GET /tenants/me/configuracion/menu` (cualquier usuario autenticado) y evento `menu:actualizar` para refrescar sin recargar. Es solo visual: no quita permisos ni cambia el plan, y la URL sigue funcionando. `humedadMin/Max` pasan a opcionales en `PATCH /tenants/me/configuracion` (se crean con 10–12 % la primera vez) para poder guardar una opción sin reenviar todo. Por defecto no se oculta nada.
- **Manual** (pedido del usuario): `apps/web/content/manual.md` es la única fuente; se ve dentro del sistema en **Administración → Ayuda** (índice, anclas, enlace "¿Cómo se usa?" desde la compra) y se lee en el repo (`docs/MANUAL.md` apunta a él). Cubre: organización del menú, por dónde empezar, comprar café (mojado, pergamino por calidad o a precio por kilo, pasilla), retención con ejemplo numérico, qué ajustar, qué hacer cuando algo no sale como se espera, teclado, glosario y tareas de quien administra la plataforma. Es honesto sobre lo que **aún no existe** (anular recepciones, pagar en el mismo paso). Renderizado con un visor de Markdown mínimo propio (`lib/markdown.tsx`, sin dependencias nuevas; no soporta tablas). Se agregó una regla a `CLAUDE.md`: actualizar el manual en el mismo PR cuando cambie lo que ve el usuario.
- **Se corrigió por el camino**: Tailwind no escaneaba `lib/`, así que las clases del visor (viñetas, sangrías) no se generaban.
- Verificado en navegador: menú agrupado, ocultar Cortes/Préstamos/Facturación/Reportes y verlo actualizado al instante (se restauró al terminar), Ayuda con índice y ancla. Captura: `docs/img/ayuda.png`.

## Sprint 2 · PR 1 — zona horaria de Colombia y retención en la fuente, cierra H5 (sesión 2026-10-01)

Rama `feat/zona-horaria-y-retencion`, apilada sobre `feat/recepcion-rapida-web` (PR #8). Decisiones del usuario: zona horaria fija America/Bogota; retención opcional (la activa el comprador en Configuración) y solo por recepción; **yo investigo y aplico los valores tributarios**. Detalle en `docs/adr/009-zona-horaria-y-retencion.md`.

- **Cubre**: H5, RF-09, CU-03, regla 7; arregla el hallazgo del Sprint 1 (sin precio después de las 7 p. m.).
- **Zona horaria**: `src/common/fecha-colombia.ts` (`diaColombia`, `anioColombia`) aplicado a la búsqueda del tramo de precios (guardado, vista previa y listado), el año del consecutivo y la vigencia del parámetro tributario. Confirmado en vivo: el tramo de la BD local estaba sembrado con el día UTC y ya no coincidía con el día de Bogotá.
- **Valores tributarios verificados** (no de memoria; dos fuentes independientes cada uno): UVT 2026 = $52.374 (Resolución DIAN 000238 de 2025); café pergamino o cereza = 0,5 % desde 70 UVT = $3.666.180 (Decreto 1625 de 2016), sin cambio con el Decreto 572 vigente desde el 1-jul-2026. Fuentes: gerencie.com (tabla 2026), UPTC (tabla 2026), buk.co y ámbito jurídico (UVT), Infobae (Decreto 572).
- **Schema** (migración `20261002000000_retencion_y_parametros_tributarios`, aditiva): `ConfiguracionTenant.esAgenteRetencion` (false), `Recepcion.baseRetencion/tarifaRetencion/valorRetencion/netoPagar` (backfill: retención 0, neto = total), tabla `ParametroTributario` con la fila 2026 sembrada.
- **Cálculo** (`recepcion/retencion.ts`, `Prisma.Decimal`): "a partir de" el umbral (en 70 UVT exactos sí retiene), a centavos mitad hacia arriba; aplica a pergamino y mojado, **no a pasilla** (interpretación a confirmar con el contador, una línea para cambiarla). Agente sin parámetro vigente → 400, no inventa. Los cuatro campos se copian e inmutan al guardar.
- **API**: `GET /recepcion/retencion` (vista previa con la misma regla), `esAgenteRetencion` en el contexto y en `PATCH /tenants/me/configuracion`.
- **Web**: casilla "Soy agente de retención en la fuente" en Configuración; la pantalla rápida muestra retención y neto a pagar en vivo y en el resultado cuando aplica.
- **Pruebas**: 7 del cálculo (borde exacto, redondeo, sin flotantes), 8 del servicio (agente, bajo umbral, no agente, pasilla, sin parámetro, día de Bogotá, vista previa) y 3 de zona horaria; integración con PostgreSQL real: retención de punta a punta con la fila sembrada, inmutabilidad, año del consecutivo el 31-dic. API: 160 unitarias aprox. y 38 de integración; lint y build limpios. Navegador (390 px): $4.300.000 → retención $21.500 → neto $4.278.500 y sin retención al desactivar (REC-2026-000021 en la BD local; la opción quedó desactivada).

### Incidente de fusión (2026-10-01)
Los PR apilados #4–#9 se fusionaron de abajo hacia arriba: #7 (tara y precio) y #8 (pantalla rápida, menú responsive, configuración) quedaron fusionados solo en ramas intermedias y **no llegaron a `main`** (`main` terminaba en #6). Este PR (#10) los trae de vuelta junto con el Sprint 2 y un arreglo de lint en los specs de pagos/anticipos (los PR apilados no corren CI). Lección: con PR apilados, fusionar de arriba hacia abajo o retargetear cada uno a `main` antes de fusionar.

### Pendiente / fuera de alcance
- **Cada diciembre**: cargar la UVT del año siguiente en `ParametroTributario` (sin pantalla de super-admin todavía; hoy con SQL/migración).
- Confirmar con un contador: pasilla sin retención, redondeo por transacción y que no se acumule por proveedor.
- Reportes agrupan en UTC (una compra de las 8 p. m. cuenta para el día siguiente): migrar a `diaColombia`.
- Anulación (RF-07/08), pago en el mismo paso (RF-10) y recibo térmico/compartir (RF-06): siguientes PR del Sprint 2. El recibo debe imprimir base, tarifa, retención y neto.

## Sprint 1 · PR 5 — pantalla de recepción rápida, cierra H3 en código (sesión 2026-10-01)

Rama `feat/recepcion-rapida-web`, apilada sobre `feat/recepcion-rapida-backend` (PR #7). Captura: `docs/img/recepcion-rapida-movil.png` (datos ficticios de la simulación).

- **Cubre**: H3, RF-02, CU-01 pasos 1–5 y 7–9 (guardar; el recibo térmico y el pago en el mismo paso son del Sprint 2), flujo 2a (alta exprés), 5b/7a parcial.
- **Decisiones de diseño** (acordadas como recomendación, el usuario dijo "sigue"): una sola pantalla; muestra solo precio y total (la retención es del Sprint 2); alta exprés en diálogo.
- **`/recepcion/rapida`** (el botón "Nueva recepción" del listado ahora va aquí; `/recepcion/nueva` sigue como "Formulario completo"):
  - Buscador de proveedor con resultados mientras se escribe (cédula, nombre o apodo, sin tildes), flechas + Enter; última opción "Nuevo proveedor" que abre el **alta exprés** con lo escrito ya repartido (número o nombre) y deja el cursor en el peso.
  - Valores por defecto: punto de compra (si hay uno), tipo de café de la última recepción del proveedor, tara por sacos.
  - **Enter avanza al siguiente campo y en el último guarda**; teclado decimal en celular; acepta coma decimal.
  - Precio y total en vivo para pergamino (`GET /tabla-precios/precio`); aviso si no hay tramo; mojado/pasilla piden precio directo; factor calculado o digitado.
  - **`Idempotency-Key`** en el guardado: mismo cuerpo reintenta con la misma llave (si se corta la señal no se duplica); cuerpo editado, llave nueva. Pantalla de resultado con código y "Nueva recepción".
- **`GET /recepcion/contexto`** (permiso `RECEPCION_CREAR`): puntos de compra, punto por defecto y peso del saco; el operador no necesita permisos de configuración. 4 pruebas unitarias.
- **Menú responsive** (`AppShell`): en pantallas chicas la barra lateral es un cajón con botón de hamburguesa. **Antes de este cambio el panel completo era inusable en celular** (la barra de 256 px dejaba ~130 px de contenido); afecta a todas las pantallas y a la plataforma de super-admin, que usan el mismo shell.
- **Configuración**: tarjeta "Recepción" para fijar el peso del saco y el rango de humedad (la web no tenía ningún formulario de `tenants/me/configuracion`).
- **Verificación**: probado en Edge headless (390 px, `puppeteer-core` desde una carpeta temporal; no se agregó ninguna dependencia al repo; la extensión de Chrome no estaba conectada): flujo completo proveedor → pesos → humedad/muestra → guardar (REC-2026-000019 y 000020 en la BD **local** de simulación; contraseña de demostración reseteada para `admin1@cooperativalosandessim.test`, no se versiona), alta exprés, búsqueda por apodo y sin tildes, y la tarjeta de configuración. Sin errores de consola. El flujo automatizado tarda ~1,9 s; **los 45 s del criterio de cierre hay que medirlos con una persona y cronómetro** (10 veces seguidas en celular).
- API: 140 unitarias; `next build` y lint de la web limpios.

### Pendiente / fuera de alcance
- Medición con cronómetro (criterio de cierre del Sprint 1) y ajustes que salgan de ahí.
- La web no tiene pruebas automatizadas (no hay framework instalado); esta pantalla se verificó a mano con el navegador. Proponer Playwright (dependencia nueva, requiere tu aprobación).
- Defectos de calidad y observaciones no están en la pantalla rápida (siguen en el formulario completo).
- Pagos, anticipos y ventas de la web aún no envían `Idempotency-Key`.
- El formulario de proveedores no tiene campo `apodo`.
- Sin detección de recepción duplicada "parecida" (mismo proveedor, mismo peso, minutos de diferencia) más allá de la llave.

## Sprint 1 · PR 4 — backend de la recepción rápida: tara por sacos y vista previa de precio (sesión 2026-10-01)

Rama `feat/recepcion-rapida-backend`, apilada sobre `feat/busqueda-proveedor` (PR #6).

- **Cubre**: CU-01 pasos 4–5 (backend), RF-01/RF-03 parcial. Prepara la pantalla web de H3.
- **Schema**: migración aditiva `20261001150000_recepcion_sacos_y_tara`: `Recepcion.numeroSacos Int?` y `ConfiguracionTenant.taraPorSacoKg Decimal(6,3)?`. Sin deriva en `migrate diff`.
- **`POST /recepcion`**: `pesoTara` pasa a opcional. Sin tara y con `numeroSacos` → tara = sacos × `taraPorSacoKg` (redondeada a 2 decimales y copiada en la recepción: cambiar el peso del saco luego no la altera). Una tara digitada (incluida 0) manda sobre el cálculo. Sin tara ni sacos, o sin peso del saco configurado → 400. Compatible hacia atrás: los clientes actuales siguen enviando `pesoTara`.
- **`PUT` de configuración** acepta `taraPorSacoKg`.
- **`GET /tabla-precios/precio?puntoCompraId&humedad&factorRendimiento`** (permiso `RECEPCION_CREAR`, el operador no necesita `PRECIOS_VER`): usa la misma búsqueda y fecha que el guardado, así la pantalla no duplica lógica de precios; el valor que manda es el del servidor al guardar. Decisión mía (reversible): endpoint en vez de calcular el tramo en el navegador.
- **Pruebas**: 7 unitarias de tara, 2 de vista previa y 2 de integración con PostgreSQL real. API: 136 unitarias y 33 de integración; lint y build limpios.
- **Hallazgo de paso (sin corregir)**: el guardado busca el tramo con `fecha = new Date()` y la fecha de la tabla de precios es `@db.Date`; la comparación se hace en UTC, así que **después de las 7 p. m. hora de Colombia el "día" ya es el siguiente y no se encuentra tramo**. Hay que decidir la zona horaria del tenant (afecta también consecutivos por año y reportes).

### Pendiente / fuera de alcance
- La pantalla web de recepción rápida y el campo de peso del saco en Configuración.

## Sprint 1 · PR 3 — búsqueda de proveedor con pg_trgm (sesión 2026-10-01)

Rama `feat/busqueda-proveedor`, apilada sobre `feat/idempotencia-pagos-ventas` (PR #5).

- **Cubre**: RF-02, RNF-01 (búsqueda < 300 ms), CU-01 paso 2–3 (backend).
- **Schema**: migración aditiva `20261001130000_proveedor_apodo_busqueda` (`CREATE EXTENSION pg_trgm`, `Proveedor.apodo`, 3 índices GIN de trigramas); aplicada a las BD de desarrollo y de pruebas; `migrate diff` sin deriva.
- **API**: `GET /proveedores/buscar?q=&limit=` (top 10, tope 20; activos del tenant; cédula que empieza igual primero, luego parecido; tolera errores de digitación; devuelve `ultimoTipoCafe`). `apodo` en crear/editar y en el filtro `q` del listado. Detalle y razones en `docs/adr/008-busqueda-proveedor-trigramas.md`. **Decisión mía (reversible)**: endpoint nuevo en vez de cambiar la forma de `GET /proveedores` para no romper la web actual.
- **Pruebas**: 8 unitarias (escape de comodines, límites, tenant) y 7 de integración con PostgreSQL real (parcial/apodo/cédula, errores de digitación, orden, aislamiento por tenant, comodines, último tipo de café, 5.000 proveedores < 300 ms). API: 127 unitarias y 30 de integración en verde; lint de lo tocado y build limpios.
- **Medido**: 9–18 ms con 5.000 proveedores en un tenant; a esa escala el planificador usa el índice por tenant, no los de trigramas (ver ADR-008).
- **`unaccent`** (migración `20261001140000_unaccent`, pedido del usuario): la búsqueda ignora tildes en ambos sentidos. Costo: esas comparaciones no usan los índices GIN de columna cruda (ver ADR-008). 8 unitarias y 31 de integración en verde.
- **Se corrigió por el camino**: un escape de `LIKE` mal escrito por mí (la prueba unitaria lo atrapó antes del commit).

### Pendiente / fuera de alcance
- La web (pantalla de recepción rápida) aún no usa el endpoint ni envía `Idempotency-Key`.
- El formulario de proveedores de la web no tiene campo `apodo` todavía.

## Sprint 1 · PR 2 — idempotencia en pagos, anticipos y ventas (sesión 2026-10-01)

Rama `feat/idempotencia-pagos-ventas`, apilada sobre `feat/idempotencia` (PR #4); retargetear a `main` cuando #4 se fusione.

- **Cubre**: regla de dominio 6 completa para recepción, pago, anticipo y venta (H7).
- **Código**: `ejecutarConLlave` en `apps/api/src/prisma/idempotencia.ts` encapsula búsqueda previa, 409, reserva y carrera; recepción pasó a usarlo (sin cambio de comportamiento) y se enganchó a `POST /pagos`, `POST /anticipos` y `POST /ventas` con el encabezado `Idempotency-Key` (alcances `PAGO`, `ANTICIPO`, `VENTA`; la llave es por alcance, la misma llave en otro alcance es otra operación).
- **Cambio de comportamiento**: crear un pago o anticipo ahora ocurre dentro de `$transaction` (antes era un `create` suelto), necesario para reservar la llave en la misma transacción. Sin llave el resultado es el mismo.
- **Pruebas**: unitarias del envoltorio (5), de pagos (4) y anticipos (4); integración con PostgreSQL real: 10 pagos simultáneos con la misma llave → uno solo, 409 con otro monto, alcance separado pago/anticipo, venta que no duplica el movimiento de salida. API: 119 unitarias y 23 de integración en verde.
- **Conciliaciones** (`ConciliacionesService.create`) no se tocó: no mueve plata nueva, y ya tiene la carrera de sobre-aplicación anotada en el Sprint 0 PR 3; se resuelve junto con su transacción/bloqueo.

### Pendiente / fuera de alcance
- La web debe enviar `Idempotency-Key` en estas cuatro operaciones (pantalla de recepción rápida y formularios de pagos/ventas).
- Contratos de venta, préstamos, abonos, secado y trilla no la aceptan aún (no son escrituras de plata directas o van en su propio PR).

## Sprint 1 · PR 1 — idempotencia en recepciones, cierra H7 en el backend (sesión 2026-10-01)

Rama `feat/idempotencia` (sobre `main` de GitHub, PR #2 ya fusionado).

- **Cubre**: H7, regla de dominio 6 (solo recepción por ahora), CU-01 flujo 7a, RNF-07.
- **Decisión (del usuario)**: tabla genérica `IdempotencyKey` en vez de una columna en `Recepcion`; 409 con misma llave y otro cuerpo; vigencia 24 h. Detalle en `docs/adr/007-idempotencia-tabla-de-llaves.md`. **El plan de `TECNICO.md` decía `Recepcion.idempotencyKey`**: se corrigió el diccionario de datos y el MER.
- **Schema**: migración aditiva `20261001120000_idempotency_keys` (tabla, índice por `expiraEn`, FK a `Tenant`); aplicada a las BD `coffee_manager` y `coffee_manager_test`. Modelo agregado a `TENANT_SCOPED_MODELS` (no va a `AUDITED_MODELS`: no mueve plata).
- **Código**: `apps/api/src/prisma/idempotencia.ts` (validar llave, huella del cuerpo, buscar, reservar, completar); `POST /recepcion` lee el encabezado `Idempotency-Key` (opcional en el servidor). La reserva es lo primero dentro de la transacción de negocio: un duplicado concurrente espera al COMMIT/ROLLBACK del primero.
- **Pruebas**: 17 unitarias del helper, 5 del servicio (sin llave, llave nueva, reintento, 409, carrera) y 7 de integración con PostgreSQL real (dos veces, 10 simultáneas, otro cuerpo, tenants distintos, vencida, rollback). API: 106 unitarias y 20 de integración en verde; `recepcion.service.ts` 100% líneas.
- **Diagramas**: MER (entidad nueva, se quitó `Recepcion.idempotencyKey`) y secuencia de recepción (el consecutivo se asigna antes del `BEGIN`, como dice ADR-003).

### Pendiente / fuera de alcance
- Idempotencia en pagos, anticipos y ventas (mismo helper), PR siguiente.
- La web aún no envía `Idempotency-Key` (va con la pantalla de recepción rápida).
- Limpieza de llaves vencidas: cola BullMQ, Sprint 3.
- Hallazgo de paso: el CLAUDE.md y TECNICO hablan de `POST /recepciones`, la ruta real es `POST /recepcion`.

## README renovado con capturas y hoja de ruta (sesión 2026-10-01)

Pedido del usuario: README bien armado con pantallazos y todo lo que se hace y se quiere hacer.

- **`README.md`** reescrito: qué hace hoy cada módulo, capturas, hoja de ruta (sprints 0–4, fases 2–3, fuera de alcance, hallazgos H1–H8 con estado), arquitectura, desarrollo local, pruebas/CI, despliegue, índice de documentación y guía de contribución. Reemplaza el texto de "scaffold inicial" que ya no era cierto.
- **`docs/img/`**: 12 capturas (login, recepción listado/nueva mojado/nueva pergamino, tabla de precios, proveedores, bodega, ventas, pagos, préstamos, reportes, configuración). Tomadas con Edge headless + `puppeteer-core` desde una carpeta temporal (no se agregó ninguna dependencia al repo; la extensión de Chrome no estaba conectada), sobre el negocio de simulación "Cooperativa Los Andes Sim" de la BD local — datos ficticios. Para ello se fijó una contraseña de demostración a `admin1@cooperativalosandessim.test` en la BD **local** (no se versiona ni se documenta).
- Aviso de entorno: en esta máquina otro proyecto (tienda de jabones) escucha en `[::1]:3000`, así que `localhost:3000` no es Coffee Manager; las capturas se tomaron con `127.0.0.1:3000`.

### Pendiente / fuera de alcance
- Las capturas son del estado actual (UI previa al rediseño de recepción rápida del Sprint 1); regenerarlas al terminar cada sprint de UI.
- Falta una captura del panel de plataforma (super-admin) y de la vista de recepción con datos cargados.

## CI: arreglo de pnpm tras el primer run real en GitHub (sesión 2026-10-01)

Primer run real del CI en el PR #1 (`ci/cobertura-y-lint`): `lint-build-test` falló en 15 s en `pnpm/action-setup@v4` con "Multiple versions of pnpm specified" — el workflow fijaba `version: 11` y `package.json` ya declara `packageManager: pnpm@11.10.0`. **Fallo preexistente** (el mismo bloque venía en `main`), no causado por los cambios del PR, pero impedía que corriera cualquier paso.

- **Fix**: se quitó `with: version: 11` en `.github/workflows/ci.yml`; la versión sale de `packageManager`. `next lint` de la web pasa limpio en local. Los pasos posteriores (lint/build/test, `test:cov`, `migrate deploy`, `migrate diff`, `test:int`) siguen **sin verificarse en GitHub**: es probable que aparezcan fallos nuevos en el siguiente run.
- **GitGuardian**: sigue marcando el commit `141cef7` (la URL `postgres:postgres@…/shadow` de la contraseña desechable del job). El fix posterior (`9c93837`) no lo limpia del historial del PR. Solución sugerida: marcarlo como falso positivo en el panel de GitGuardian; reescribir historial queda descartado salvo que el usuario lo pida.

### Pendiente / fuera de alcance
- Push de la rama y revisar el siguiente run del CI.

## CI sin credenciales literales tras alerta de GitGuardian (sesión 2026-09-30)

Al abrir el PR de `ci/cobertura-y-lint`, el bot GitGuardian marcó 1 secreto. Era falso positivo: la URL `postgres:postgres@localhost…/shadow` que se había agregado al paso "El schema coincide con las migraciones" de `.github/workflows/ci.yml` (contraseña desechable del servicio postgres del job; la de `apps/api/.env` local también es `postgres`, pero ese archivo no está versionado). Se comprobó que ni esa contraseña ni los dos secretos JWT locales aparecen en el historial de las ramas más allá de ese literal genérico.

- **Fix** (commit `9c93837`): el paso usa el `DATABASE_URL` del job — `psql "${DATABASE_URL%%\?*}"` (libpq no acepta `?schema=`) y `--shadow-database-url "${DATABASE_URL/coffee_manager?/shadow?}"` — sin repetir usuario ni contraseña. Expresiones probadas en bash; YAML validado; **no ejecutado todavía en GitHub**.
- El commit anterior sigue en el historial del PR, así que GitGuardian puede seguir marcándolo: se recomendó al usuario marcarlo como falso positivo en su panel (no se reescribió historial ni se hizo push forzado).

### Pendiente / fuera de alcance
- El usuario debe hacer `git push` de la rama para que el fix llegue al PR y confirmar que `CI / lint-build-test` pasa en GitHub (primera ejecución real del CI nuevo: pasos `test:cov`, `migrate diff` y `test:int`).

## Sprint 0 · PR 4 — CI: cobertura mínima, schema↔migraciones y lint verde (sesión 2026-09-30)

Rama `ci/cobertura-y-lint` (sobre `test/dominio-pagos`; commits locales, sin push).

- **Cubre**: RNF-07, flujo de trabajo de TECNICO.md ("CI: lint, tipos, pruebas y `prisma migrate diff`").
- **`apps/api/package.json`**: `coverageThreshold` de Jest — 90% líneas/sentencias/funciones y 85% ramas para `src/modules/recepcion/*.service.ts` y `src/modules/pagos/*.service.ts`. Verificado: al quitar una prueba el umbral falla. (Las claves de ruta son relativas a `apps/api`, no a `rootDir`.)
- **`.github/workflows/ci.yml`**: nuevos pasos — `test:cov` (umbral), `prisma migrate deploy`, `prisma migrate diff --exit-code` (el schema debe coincidir con las migraciones; probado local: "No difference detected") y `test:int` (PostgreSQL del job). YAML validado, **no ejecutado en GitHub todavía**.
- **Lint**: los únicos errores no-formato eran 4 (`ninguno.provider.ts` 3 parámetros sin usar, `query-viajes.dto.ts` import sin usar) + 1 aviso (`main.ts` promesa sin await) — corregidos sin cambiar comportamiento. Los demás errores que `eslint` muestra son de formato Prettier (líneas largas) y `pnpm lint` los corrige solo con `--fix`; en CI no fallan. Con esto `pnpm lint` queda sin errores en la API (la web no se revisó).
- **No hecho — requiere acción tuya**: "CI bloquea el merge" exige activar la protección de `main` en GitHub (Settings → Branches → exigir el check `lint-build-test` antes de fusionar). No tengo cómo hacerlo desde aquí.

### Pendiente / fuera de alcance
- PR 5 (Sentry): agrega dependencias (`@sentry/nestjs`, `@sentry/nextjs`) y necesita DSN; esperar aprobación del usuario.

## Sprint 0 · PR 3 — pruebas unitarias de pagos, cierra H2 (sesión 2026-09-30)

Rama `test/dominio-pagos` (sobre `feat/consecutivos-atomicos`; commits locales, sin push).

- **Cubre**: H2, RNF-07. Sin cambios de código de producción.
- **Pruebas** (`apps/api/src/modules/pagos/`): `pagos.service.spec.ts`, `anticipos.service.spec.ts`, `conciliaciones.service.spec.ts` — 40 pruebas con Prisma simulado: validaciones de proveedor/punto/recepción/pago, `estadoCuenta` (comprado, pagado excluyendo `CREDITO`, anticipos, conciliado, préstamos vigentes, `saldoNeto` negativo cuando el proveedor debe), saldo disponible del anticipo (aplicar exacto vs. excederlo por 1), filtros y rangos de fecha. Cobertura de líneas 100% en los tres servicios (ramas 88–100%). Total API: 84 unitarias pasan.
- **Hallazgos de paso** (sin corregir):
  - `ConciliacionesService.create` verifica el saldo del anticipo leyendo y luego escribiendo, sin transacción ni bloqueo: dos conciliaciones simultáneas pueden sobre-aplicar un anticipo. Mismo patrón de carrera que H1; arreglar con transacción + bloqueo de fila (`SELECT … FOR UPDATE`) o una restricción en BD.
  - `estadoCuenta` calcula saldos con `Number` (no `Decimal`) y trae todas las filas del proveedor a memoria: aceptable hoy, no escala con historiales largos (usar agregados `SUM` en SQL).
  - Pagos/anticipos todavía no aceptan llave de idempotencia (regla de dominio 6; sprint 1).

### Pendiente / fuera de alcance
- PR 4 (CI con cobertura mínima), PR 5 (Sentry — requiere aprobar dependencia).

## Sprint 0 · PR 2 — consecutivos atómicos, cierra H1 (sesión 2026-09-30)

Rama `feat/consecutivos-atomicos` (sobre la de PR 1; commits locales, sin push). Base de pruebas: PostgreSQL 16 del contenedor `docker-postgres-1` en WSL (hay que dejar `wsl -e sleep infinity` corriendo o WSL se apaga y reinicia los contenedores), BD `coffee_manager_test`.

- **Schema**: migración `20261001024919_consecutivos_atomicos` — enum `TipoConsecutivo`, tabla `Consecutivo` (PK `tenantId+tipo+anio`, FK a Tenant) y siembra desde el mayor consecutivo existente por tenant/tipo/año. **Aplicada también a la BD de desarrollo `coffee_manager`**: sembró 7 contadores a partir de 65 recepciones y los demás documentos de la simulación (ej. REC-2026 → 20).
- **Backend**: `apps/api/src/prisma/consecutivo.ts` (`siguienteConsecutivo`, un `INSERT … ON CONFLICT DO UPDATE … RETURNING`); reemplaza `count()+1` en **7 servicios**: recepción, secado, trilla, préstamos, ventas, contratos de venta y viajes. `Consecutivo` agregado a `scoped-models.ts` (regla de dominio 8). Prettier reformateó de paso algunas líneas largas en `ventas.service.ts` y `contratos-venta.service.ts`.
- **Pruebas**: `apps/api/test/consecutivos.int-spec.ts` + `test/jest-int.json` + script `pnpm --filter api test:int` (13 pruebas con PostgreSQL real: formato, 7 prefijos, independencia por tipo/año/tenant, siembra, 100 llamadas concurrentes sin repetir ni saltar, y 100 recepciones con `RecepcionService` real). Con el código antiguo la prueba de recepciones falla con `Unique constraint failed on (tenantId, codigo)`; con el nuevo pasan 13/13 en ~1,5 s. Unitarias: 44 pasan. CI (`ci.yml`) ahora corre `prisma migrate deploy` y `test:int`.
- **Decisiones que difieren del plan** (también en ADR-003 y TECNICO.md): (1) el año va en la llave; (2) el consecutivo se asigna **antes** de abrir la transacción, no dentro (puede dejar huecos, nunca duplicados) — dentro de la transacción el candado agotaba el pool porque la auditoría usa otra conexión.
- **Hallazgo importante, preexistente y sin corregir**: `audit-log.extension.ts` escribe el `AuditLog` con el cliente base, fuera de la transacción. Efectos: (a) cada recepción necesita 2 conexiones a la vez, así que ≥ ~(pool/2) recepciones simultáneas pueden bloquearse hasta el timeout (pool por defecto = CPUs×2+1, p. ej. 5 en un VPS de 2 vCPU); (b) si la transacción se revierte, el registro de auditoría ya quedó escrito. Por eso la prueba de 100 recepciones usa 10 en vuelo con pool de 20. Pendiente: PR "auditoría transaccional" (y/o fijar `connection_limit` en producción).

### Pendiente / fuera de alcance
- PR 3 (pruebas de `pagos`), PR 4 (CI con cobertura mínima), PR 5 (Sentry — requiere aprobar dependencia).
- Auditoría transaccional; migrar plata de `number` a `Decimal`; ~40 errores de lint preexistentes.

## Sprint 0 · PR 1 — pruebas unitarias de dominio de recepción (sesión 2026-09-30)

Pedido del usuario: ejecutar todo el plan de `docs/TECNICO.md`, un PR a la vez con pruebas primero. Rama `test/dominio-calidad-recepcion` (2 commits locales, sin push ni PR abierto).

- **Cubre**: H2, RNF-07 (parcial). Reglas de dominio 2–3 documentadas pero aún no implementadas (llegan en sprints 1–2).
- **Pruebas agregadas** (`apps/api/src/modules/recepcion/`): `recepcion.service.spec.ts` y `tabla-precios.service.spec.ts` — 42 pruebas con Prisma simulado: peso neto (redondeo, rechazo ≤ 0), factor de rendimiento (CALCULADO/MANUAL, validaciones), tramo de precio (prioridad punto sobre general, sin tramo → 400), valor total, MOJADO/PASILLA con precio directo, movimiento de inventario, análisis y defectos, código `REC-año-NNNNNN`, traducción de P2003, validaciones de proveedor/punto. Cobertura: `recepcion.service.ts` 100% líneas / 94% ramas; `tabla-precios.service.ts` 100%.
- **Sin cambios de código de producción.** Son pruebas de caracterización: fijan el comportamiento actual antes de refactorizar en el PR 2.
- **Hallazgos de paso** (no corregidos aquí):
  - El módulo `calidad` solo sirve el catálogo de defectos; la lógica de calidad (factor, tramo) vive en `recepcion/`. La meta de ≥ 90% en `calidad` es trivial; la real está en `recepcion`.
  - El cálculo de plata usa `number` + `Math.round` (peso neto, valor total), no `Decimal` — contradice la regla de dominio 1. Migrar a `Prisma.Decimal` queda pendiente (propuesto como PR aparte).
  - `pnpm lint` corre con `--fix` y reescribe archivos no relacionados (19 en esta sesión; se revirtieron). Además hay ~40 errores de lint preexistentes en `main.ts`, `ninguno.provider.ts`, `query-viajes.dto.ts` y otros: CI (`pnpm lint`) probablemente ya fallaba antes. Pendiente decidir si se arreglan o se ajusta la regla.
  - No hay Docker ni PostgreSQL local en esta máquina: las pruebas de integración con base real (PR 2) correrán en CI (que tiene servicio postgres) y no se pueden ejecutar localmente sin instalar uno.
- Los documentos del plan (`CLAUDE.md`, `docs/TECNICO.md`, `docs/adr/`, `docs/diagramas/`) entran en el primer commit de esta rama.

### Pendiente / fuera de alcance
- PR 2 (consecutivos atómicos), PR 3 (pruebas de `pagos`), PR 4 (CI con cobertura), PR 5 (Sentry).

## Arranca el plan técnico v1.0: documentación y ADR (sesión 2026-09-30)

Pedido del usuario: incorporar la documentación técnica y plan de desarrollo v1.0 al repo (sin tocar código). Los archivos llegaron como `CLAUDE (1).md` y `Coffee Manager — Documentación técnica y plan de desarrollo.md`; el usuario autorizó renombrarlos.

- **Docs**: `CLAUDE.md` (raíz, instrucciones permanentes con reglas de dominio y actualización obligatoria de docs) y `docs/TECNICO.md` (RF/RNF, casos de uso CU-01..03, modelo de datos, arquitectura, escalabilidad, sprints 0–4, hallazgos H1–H8).
- **Diagramas** (copiados tal cual del anexo de TECNICO.md): `docs/diagramas/mer.md` (MER de 37 tablas: 34 actuales + `Consecutivo`, `ParametroTributario`, `Finca` propuestas) y `docs/diagramas/secuencia-recepcion.md`.
- **ADR** en `docs/adr/`: `001-monolito-modular`, `002-multitenant-base-compartida`, `003-consecutivos-por-contador`, `004-recepciones-inmutables`, `005-trabajos-externos-por-cola`, `006-hostinger-coolify` (contexto, decisión, consecuencias; redactados a partir de TECNICO.md, que solo da el título de cada uno).
- Sin cambios de código, schema ni infraestructura.

### Pendiente / fuera de alcance
- Sprint 0 (consecutivos atómicos H1, pruebas de dominio H2, CI, Sentry) es el siguiente paso; aún no iniciado.
- Los ADR son borradores derivados del documento: revisar que reflejen lo que el usuario realmente decidió (p. ej. ADR-006).
- El MER fue copiado del anexo, no regenerado desde `schema.prisma`; regenerar al cambiar el schema.

## Simulación de un mes de operación en 3 tenants + auditoría de bugs (sesión 2026-09-27, continuación)

Pedido del usuario: simular ~1 mes de actividad real con varios negocios ("clientes") comprando y vendiendo café, encontrar fallos y cosas a mejorar, con foco en que la compra/ingreso de datos sea rápido, y reportar si la data generada ocupa mucho espacio en disco.

- **Script de simulación** (`node` ad-hoc contra la API local, no queda en el repo — vivía en el scratchpad de la sesión): creó 3 tenants (`Cooperativa Los Andes Sim`, `Finca El Mirador Sim`, `Trilladora San Jose Sim`), cada uno con 2 puntos de compra, 8 proveedores, tabla de precios (2 tramos), ~24 recepciones mezclando PERGAMINO/MOJADO/PASILLA, procesos de secado y trilla, anticipos/pagos con los 4 métodos de pago, un préstamo con abono parcial, compradores, ventas (incluida una entrega parcial contra un contrato de venta), y casos límite deliberados (proveedor duplicado, anticipo/abono con CREDITO, pago CHEQUE sin número, venta que excede stock, venta con lotes que no cuadran, recepción PERGAMINO fuera de cualquier tramo de precio, tenant con email de admin repetido). Total 233 llamadas API.
- **Resultado de los casos límite**: todos devuelven 4xx con mensaje claro (verificado también a mano con curl, no solo confiando en el script) — nada de 500 en las validaciones de negocio ya existentes.
- **Bug encontrado y arreglado — mismo patrón en un segundo lugar**: `UsersService.create()` (`apps/api/src/modules/users/users.service.ts`, usado por `POST /users` para agregar usuarios dentro de un tenant) tenía el mismo problema que se arregló hoy en `PlatformService.createTenant` — `User.email` es único global y no se capturaba el conflicto. Arreglado con el mismo patrón (chequeo previo + catch de `P2002` → 409 `Ese correo ya está en uso por otro usuario`). Verificado con curl: usuario con el email del admin de otro tenant → 409 en vez de 500. **No se auditó ningún otro punto del código que haga `tx.user.create()`** más allá de estos dos (`createTenant` y `RegistroService`, que ya lo manejaba bien) — si aparece un tercero, es la misma causa.
- **Velocidad**: a nivel de API, excelente — latencia promedio 20ms por llamada, 21ms para un `POST /recepcion` (una compra) sobre 72 muestras, ninguna llamada superó 500ms. La velocidad real de captura en campo depende del formulario del frontend (clics/campos), que no se pudo medir porque la extensión de Claude in Chrome no está conectada en este equipo — evaluación pendiente de una sesión con navegador disponible.
- **Espacio en disco**: la base de datos local completa pesa **11 MB** y el volumen de Docker `docker_postgres_data` **68.59 MB** — la simulación no representa un problema de espacio ni de lejos. (De paso, se encontraron otros volúmenes Docker de proyectos no relacionados ocupando varios GB en la misma máquina — no se tocaron, es información aparte para el usuario, no de este proyecto.)
- Los 3 tenants de simulación (`estado: PRUEBA`) quedaron en la base local junto con los datos preexistentes de julio 2026 (`Finca Demo`, `Finca El Roble`, `Cooperativa La Esperanza`, etc.) — no se borraron porque el espacio es insignificante; limpiarlos requeriría un script de borrado en cascada (no existe `DELETE` de tenant en la API a propósito) que no se justificó construir dado lo poco que pesan.

### Pendiente / fuera de alcance
- Evaluar la velocidad real de captura de datos en el frontend (clics, tabs, campos por formulario) — necesita sesión con extensión de navegador conectada.
- Auditar el resto del código en busca de más `tx.user.create()` o patrones equivalentes con constraints únicos sin capturar (solo se encontraron y arreglaron los 2 casos que se reprodujeron).
- Limpieza de los 3 tenants de simulación en la base local, si en algún momento se quiere una base "limpia" para demos (hoy no es necesario, el espacio es mínimo).

## Setup de entorno local + hook y skill de documentación automática (sesión 2026-09-27)

Pedido del usuario: levantar el proyecto en local (nunca se había corrido en esta máquina) y recuperar/resetear credenciales de acceso, tanto locales como de producción. De paso, pidió una skill + hook que documente automáticamente el trabajo en esta bitácora para no depender de que alguien se acuerde de hacerlo a mano.

- **Entorno local**: máquina nueva, sin `.env`, sin `node_modules`, sin Docker Desktop instalado. Se encontró que Postgres del proyecto ya corría dentro de WSL (Ubuntu, contenedor `docker-postgres-1`) con datos de sesiones de julio 2026 — no hubo que crear la base desde cero. Se instaló `pnpm` global (corepack falló por permisos en `Program Files`, se usó `npm install -g pnpm` en su lugar). Se generaron `apps/api/.env` y `apps/web/.env.local` desde los `.example` con secretos JWT nuevos (antes placeholders `change-me-*`). Se aplicaron las 3 migraciones que estaban pendientes en esa base (`prestamos_proveedor`, `viajes_cortes_entrega`, `plan_modulos_precio`) — las dos últimas no tenían entrada en esta bitácora (ver nota abajo).
- **Corrección de bug de `pnpm dev`**: `apps/api/package.json` no tenía script `dev` (solo `start:dev`), así que `turbo run dev` en la raíz omitía la API silenciosamente (turbo no falla si un paquete no define la tarea) — solo levantaba el web. Se agregó `"dev": "nest start --watch"` (mismo comando que `start:dev`) para que `pnpm dev` en la raíz levante ambos como documenta el README.
- **Credenciales**: admin local (`PlatformAdmin` en la base de WSL) reseteado vía `prisma db seed` (upsert por email, sin tocar el resto de los datos) — nuevo email/clave entregados al usuario directamente, no se guardan aquí. Para producción (Neon), se consultó (solo lectura) el admin existente `frankpalma0605@gmail.com` (su clave no se tocó). En vez de resetearlo, se creó un **segundo `PlatformAdmin`** con el correo real del usuario (`mltnqntr@gmail.com`) tanto en local como en producción, corriendo `prisma db seed` con `DATABASE_URL` apuntando a Neon — mismo mecanismo que usa Render en su primer arranque, sin tocar SQL a mano ni los admins existentes.
- **MCP**: se registró un servidor MCP `neon-prod` (`@modelcontextprotocol/server-postgres`, solo lectura) apuntando a la base de producción de Neon, en scope `local` (`claude mcp add -s local`) — vive en `~/.claude.json`, nunca se sube al repo. Se decidió explícitamente no usar un MCP de escritura para crear usuarios: un `User` requiere tenant + rol + permisos coherentes, así que las altas se hacen vía la API (`POST /platform/tenants`) o el seed, no por `INSERT` directo.
- **Bug encontrado y arreglado — 500 al crear tenant con email duplicado**: `User.email` es único **globalmente** (`schema.prisma:346`, no por tenant), pero `PlatformService.createTenant` (`platform.service.ts`) no capturaba la violación de constraint de Prisma al reusar un correo ya registrado en otro tenant — tiraba un 500 crudo en vez de un mensaje claro. Reproducido en producción (`POST /platform/tenants` con un correo repetido). Arreglado con el mismo patrón que ya usaba `RegistroService` (chequeo previo con `findUnique` + catch de `P2002` en la transacción) → ahora responde `409 Ese correo ya está en uso por otro usuario`. Verificado local con curl (crear tenant ok, repetir mismo `adminEmail` → 409 en vez de 500) antes de subir el fix.
- **Documentación automática**: `.claude/hooks/check-progreso.sh` (hook `Stop`, registrado en `.claude/settings.json`) revisa en cada turno si hay cambios de git (sin commitear, o commiteados) que no estén reflejados en este archivo, y si los hay bloquea el fin del turno pidiendo que se use la skill `.claude/skills/documentar-progreso/SKILL.md` para ponerlo al día. Antes todo `.claude/` estaba en `.gitignore`; se ajustó para que `settings.json`, `hooks/` y `skills/` sí viajen con el repo (el resto del estado local de Claude Code se sigue ignorando).

### Nota: trabajo previo sin documentar, encontrado al retomar
Al aplicar migraciones pendientes se encontraron dos sin entrada en esta bitácora: `20260711230831_viajes_cortes_entrega` y `20260713132148_plan_modulos_precio`. La API además expone un `ViajesModule` completo (`/viajes`, `/viajes/ventas-sin-asignar`, CRUD de viajes con ventas asociadas) que tampoco aparece en las secciones "Backend"/"Frontend" más abajo. No se documenta el detalle aquí porque no hay contexto de qué se decidió con el usuario en esas sesiones — **queda pendiente completar esta entrada retroactivamente** (o confirmar que ya no aplica) la próxima vez que se toque el módulo de Viajes.

### Pendiente / fuera de alcance
- El hook/skill nuevos no quedaron activos en la sesión que los creó (el watcher de Claude Code no detecta `.claude/` si no existía al arrancar la sesión) — hace falta abrir `/hooks` una vez o reiniciar Claude Code para que tomen efecto.
- El mismo problema de "email único global sin mensaje claro" podría repetirse en cualquier otro punto que cree `User` directamente (no solo `createTenant`) — no se auditó el resto del código en busca de otros casos, solo se arregló el que se reprodujo.

## Módulo de Préstamos a proveedores (sesión 2026-07-11)

Pedido del usuario: un módulo de préstamos, adicional a los ya existentes. Antes de construir se confirmaron 3 decisiones de diseño con el usuario: (1) se presta **al proveedor/caficultor** (financiación al productor), no es deuda propia del negocio; (2) **sin interés** — solo se lleva el capital prestado y sus abonos; (3) se devuelve con **abonos en efectivo/transferencia**, como pagos independientes al préstamo (NO se descuenta del café entregado — eso lo cubre el concepto ya existente de `Anticipo`). El préstamo es, por tanto, un concepto distinto del anticipo: el anticipo se concilia contra café, el préstamo se devuelve con dinero.

- **Schema**: dos modelos nuevos + un enum. `Prestamo` (código `PRE-{año}-{secuencial}` único por tenant, proveedor, punto de compra, `monto`, `fecha`, `estado`: VIGENTE/PAGADO/CANCELADO, notas) y `AbonoPrestamo` (monto, `metodoPago`, referencia, notas; `onDelete: Cascade` desde el préstamo). Enum `EstadoPrestamo`. Nuevos permisos `PRESTAMOS_VER/CREAR/EDITAR` (mismo patrón que Anticipos). Migración `20260711175720_prestamos_proveedor`. Ambos modelos agregados a `TENANT_SCOPED_MODELS` y a `AUDITED_MODELS` (auditados automáticamente).
- **Backend** (`src/modules/prestamos`, un solo service/controller):
  - `POST /prestamos` — crea el préstamo en VIGENTE (valida proveedor y punto de compra activos, genera el código correlativo en transacción, mismo patrón que ContratoVenta).
  - `GET /prestamos` (filtros: proveedor, punto de compra, estado, rango de fechas), `GET /prestamos/:id` — cada préstamo devuelve `saldoPendiente` y `totalAbonado` **calculados al vuelo** (no se persisten), coherente con Anticipo.
  - `POST /prestamos/:id/abonos` — registra un abono; **CREDITO rechazado** con 400 (un abono es siempre caja real que entra); rechaza si el abono excede el saldo pendiente; si el abono salda el préstamo (tolerancia 0.01) lo marca `PAGADO` en la misma transacción; rechaza abonar a un préstamo no vigente.
  - `PATCH /prestamos/:id/cancelar` — solo si está VIGENTE (el saldo pendiente queda sin cobrar).
  - Verificado end-to-end con curl (tenant de prueba sembrado directo en DB): creación con código correlativo y saldo=monto, abono parcial (saldo baja, sigue VIGENTE), rechazo de abono que excede saldo, rechazo de CREDITO, abono final → transición automática a PAGADO con saldo 0, rechazo de abono a préstamo pagado, cancelación de un segundo préstamo → CANCELADO con rechazo de abono posterior y de re-cancelación, filtros por estado, y auditoría confirmada por query directa a `AuditLog` (2× Prestamo CREAR, 2× AbonoPrestamo CREAR, 2× Prestamo EDITAR por las transiciones PAGADO/CANCELADO).
- **Frontend**: nuevo ítem de nav "Préstamos" (icono `HandCoins`) en el dashboard del tenant, más un acceso desde `/pagos`. `/prestamos` (listado con código, monto, saldo pendiente y badge de estado), `/prestamos/nuevo` (proveedor + punto de compra + monto + notas, mismo patrón que `/pagos/anticipos/nuevo`), `/prestamos/[id]` (resumen monto/abonado/saldo/estado, historial de abonos, formulario inline de abono acotado al saldo con `max`, y botón "Cancelar préstamo" con confirmación — visibles solo si VIGENTE). Grupo "Préstamos" agregado al grid de permisos en `/configuracion/roles`. `packages/shared-types`: `EstadoPrestamo`, `Prestamo`, `PrestamoDetalle`, `AbonoPrestamo` + los 3 permisos. Verificado con `pnpm build` limpio (turbo, api + web) y la ruta `/prestamos` sirviendo 200.

### Integración con el estado de cuenta del proveedor (misma sesión)
A pedido del usuario, se integró el saldo de préstamos en `GET /pagos/cuenta/:proveedorId` (`PagosService.estadoCuenta`): se agregaron `totalPrestado`, `totalAbonadoPrestamos` y `saldoPrestamosPendiente` (solo préstamos **VIGENTES** — los PAGADOS están en cero y los CANCELADOS anulados), más `saldoNeto` = `saldoPendienteEstimado` − `saldoPrestamosPendiente` (positivo = el negocio le debe neto; negativo = el proveedor debe neto). **No se alteró la semántica de `saldoPendienteEstimado`** (sigue siendo compras − pagos − conciliado); el préstamo es dinero en dirección opuesta (lo que el proveedor debe al negocio), por eso se muestra aparte y se netea explícitamente. Frontend `/pagos/cuenta` ampliado con las 3 tarjetas de préstamos + tarjeta de "Saldo neto" con leyenda de a favor de quién. `packages/shared-types` `EstadoCuentaProveedor` ampliado. Verificado con curl: préstamo vigente de 800k con abono de 300k → `saldoPrestamosPendiente` 500k, `saldoNeto` −500k, excluyendo correctamente los préstamos pagado/cancelado del mismo proveedor.

### Pendiente / fuera de alcance
- El préstamo aún **no aparece en el dashboard de Reportes** como KPI propio (el estado de cuenta del proveedor sí lo integra, ver arriba). Sería el mismo cálculo agregado por si se quiere un KPI de "préstamos por cobrar".
- Sin interés por decisión explícita del usuario — si en el futuro se necesita, habría que agregar tasa + cálculo sobre saldo (no está modelado).
- Los permisos nuevos `PRESTAMOS_*` se conceden automáticamente al rol "Administrador" al **crear** un tenant (`Object.values(Permission)` en registro/platform). Tenants creados **antes** de esta migración no los tienen en su rol Administrador hasta hacer backfill (agregar las filas `RolePermission` o reasignar permisos desde `/configuracion/roles`), porque el guard no tiene bypass de admin — resuelve permisos desde `RolePermission`.
- Sin `PATCH`/`DELETE` de un préstamo o abono ya creados (mismo alcance deliberadamente limitado que Pagos/Anticipos: son registros financieros).

## Rediseño de dashboards + Solicitudes de registro (sesión 2026-07-10, continuación)

Dos pedidos del usuario en la misma pasada: (1) llevar el mismo nivel de diseño de la landing a las dashboards internas (tenant y plataforma), y (2) en el panel de plataforma, una sección dedicada de "Solicitudes" donde aparezca cada autorregistro con su info completa y se pueda aprobar o rechazar.

- **Schema**: nuevo valor `RECHAZADO` en `EstadoTenant` (migración `20260710213817_add_estado_rechazado`) — bloquea login igual que `PENDIENTE`/`SUSPENDIDO`, vía el mismo `assertTenantAccesible()`. Esto resuelve el "fuera de alcance" de la sesión anterior ("no hay acción de rechazar").
- **Backend**:
  - `RegistrarTenantDto` acepta `adminTelefono` opcional; se guarda tanto en `User.telefono` como en `Tenant.telefono` (antes ningún registro capturaba teléfono de contacto).
  - `PlatformService.listTenants()` ahora incluye `contacto: { nombre, email, telefono }` — el primer usuario creado en la transacción de alta (admin que se registró o para quien se creó el tenant manualmente), sin necesidad de endpoint nuevo. `PATCH /platform/tenants/:id` ya soportaba cualquier valor del enum `estado`, así que `RECHAZADO` funciona sin tocar el controller.
  - Verificado con curl: registro con teléfono → aparece en `/platform/tenants` con `contacto` completo → aprobado con plan asignado en el mismo request.
- **Frontend**:
  - Componentes nuevos compartidos: `components/shell/app-shell.tsx` (sidebar unificado, antes duplicado casi textual entre `(dashboard)/layout.tsx` y `platform/layout.tsx` — ahora un solo componente con `font-display` en la marca, indicador de sección activa con acento lateral, badges de conteo), `components/shell/page-header.tsx` (título+descripción+acciones consistente) y `components/shell/stat-card.tsx` (tarjeta KPI, reemplaza la copia local que tenía `reportes/page.tsx`). `components/ui/dialog.tsx` — modal ligero sin dependencias nuevas (no hay Radix en el proyecto), con Escape/click-afuera para cerrar.
  - **`/platform/solicitudes`** (página nueva): tarjetas por cada tenant `PENDIENTE` con contacto (nombre/email/teléfono), NIT, fecha, selector de plan a asignar, y botones Aprobar/Rechazar que abren un `Dialog` de confirmación antes de aplicar el cambio. Nav del panel de plataforma con ítem "Solicitudes" y badge con el conteo de pendientes.
  - `/platform/page.tsx` (Tenants) simplificado: ya no tiene el botón "Aprobar" inline (se movió a Solicitudes) — un tenant `PENDIENTE` muestra "Revisar solicitud" que enlaza allá; `RECHAZADO` se puede reactivar con el mismo botón "Activar" que ya existía para `SUSPENDIDO`.
  - **Barrido de las ~34 páginas internas restantes** (bodega, recepción, ventas, pagos, facturación, configuración, y el resto de plataforma): headers `<h1 className="text-2xl font-semibold">` migrados a `<PageHeader>` — visual únicamente, sin tocar lógica de negocio ni estructura de tablas. `pagos/cuenta/page.tsx` quedó con su `StatCard` local sin consolidar (no era parte de esta pasada).
  - `app/(auth)/register/page.tsx` — nuevo campo opcional "Teléfono de contacto".
  - `packages/shared-types`: `EstadoTenant.RECHAZADO`, `PlatformTenant.telefono` + `PlatformTenant.contacto`.
  - Verificado con `pnpm --filter web build` limpio (38 rutas, sin errores nuevos) y con curl end-to-end: registro nuevo → aparece en `/platform/tenants` con `contacto`/`telefono` → visible como pendiente. **No se probó visualmente en navegador** (mismo límite de siempre, sin herramienta de automatización disponible).

### Pendiente / fuera de alcance
- "Dar permisos" al aprobar no tiene un control granular nuevo: el rol "Administrador" que se crea en el registro ya tiene *todos* los permisos dentro de su tenant (así funcionaba desde antes) — lo único que la aprobación controla de verdad es el `estado` y el `plan` (que fija `maxUsuarios`/`maxPuntosCompra`). Si en el futuro se quiere que el plan también limite *qué módulos* puede ver un tenant (no solo cuántos usuarios/puntos de compra), es una feature nueva, no estaba pedida explícitamente esta vez.
- Sin motivo de rechazo persistido (el enum solo guarda el estado, no un texto con la razón) — si hace falta auditar por qué se rechazó algo, hoy solo queda en `AuditLog` genérico (el modelo `Tenant` está en `AUDITED_MODELS`), no en un campo dedicado.
- Sin notificación por correo al aprobar/rechazar (mismo pendiente de la sesión anterior, sigue sin haber servicio de email).

## Landing page pública + autorregistro con aprobación (sesión 2026-07-10)

Pedido del usuario: una página principal pública (Inicio/Sobre nosotros/Planes) con los logins visibles, y que el registro esté habilitado pero la cuenta quede pendiente de activación — la aprueba un admin de plataforma según el plan. Esto reemplaza la decisión anterior de la Fase 1 ("onboarding manual por diseño, `/register` placeholder") — ahora hay dos caminos: autorregistro público (pendiente de aprobación) o alta manual desde `/platform/tenants/nuevo`, conviven sin conflicto.

- **Schema**: nuevo valor `PENDIENTE` en `EstadoTenant` (migración `20260710210331_tenant_pendiente_aprobacion`). Un tenant `PENDIENTE` no puede iniciar sesión — mismo mecanismo que ya bloqueaba `SUSPENDIDO` (`AuthService`), factorizado en un solo `assertTenantAccesible()` con mensaje distinto para cada caso.
- **Backend** — nuevo módulo público `src/modules/registro` (sin ningún guard, endpoints con `@Public()`):
  - `GET /registro/planes` — catálogo de planes reducido a solo lo necesario para mostrar precios/límites en la página pública (sin datos internos).
  - `POST /registro` — autorregistro: crea Tenant en `PENDIENTE` (+ plan elegido opcional) + rol "Administrador" con todos los permisos + primer usuario, mismo patrón transaccional que `PlatformService.createTenant`, pero **forzando el estado** (un registro público nunca puede activarse solo, ni aunque alguien manipule el request). Rechaza correos duplicados con mensaje claro (`409 Ese correo ya está registrado`) en vez de dejar pasar un error crudo de Postgres.
  - Aprobar sigue siendo el mismo `PATCH /platform/tenants/:id` que ya existía (`{ estado: 'ACTIVO' }`) — no hizo falta un endpoint nuevo para eso.
  - Verificado con curl: registro público → login rechazado (`PENDIENTE`) → aparece en `/platform/tenants` → `PATCH` a `ACTIVO` → login exitoso. Y el rechazo por correo duplicado.
- **Frontend**:
  - `app/page.tsx` (raíz) reemplazado: antes redirigía siempre a `/login` o `/proveedores`; ahora, si no hay sesión, muestra una landing real (hero, características, "Sobre nosotros", "Planes" con los datos de `/registro/planes`, CTA) con botones **Ingresar** y **Crear cuenta** en el header, y un link discreto a `/platform/login` en el footer (no se promociona al público general). Si hay sesión activa, sigue redirigiendo al dashboard como antes.
  - `app/(auth)/register/page.tsx` — antes placeholder, ahora formulario real (nombre del negocio, NIT opcional, datos del admin con `PasswordInput`, plan opcional) que llama a `POST /registro` y muestra el mensaje de "pendiente de aprobación" en vez de loguear automáticamente.
  - `app/platform/page.tsx` — Badge nuevo para `PENDIENTE`, los tenants pendientes se listan primero, aviso visible cuando hay alguno. *(Actualización: el botón de aprobar/rechazar en sí se movió a `/platform/solicitudes` en la sesión siguiente, ver sección "Rediseño de dashboards + Solicitudes de registro" más arriba.)*
  - `packages/shared-types`: `EstadoTenant.PENDIENTE` + `PlanPublico` (forma reducida de `Plan` para el endpoint público).

### Pendiente / fuera de alcance
- Sin envío de correo al aprobar/registrar (no hay servicio de email integrado en el proyecto) — el usuario se entera revisando `/platform` manualmente, o el interesado reintentando login.
- ~~No hay acción de "rechazar" un registro pendiente~~ — resuelto en la sesión siguiente con `EstadoTenant.RECHAZADO`, ver sección "Rediseño de dashboards + Solicitudes de registro" más arriba.
- El copy de "Sobre nosotros" es un placeholder razonable centrado en el producto (no tengo la historia real de la empresa) — se edita directamente en `app/page.tsx` cuando haya contenido de marca definitivo.

## Contratos de venta anticipada (sesión 2026-07-10)

Pedido del usuario (gerente de compra): vender café por adelantado a una trilladora, fijando precio hoy, y que cuando efectivamente se venda/entregue el café más adelante, sea a ese precio ya pactado. Antes de construir se confirmaron 3 decisiones de diseño con el usuario: (1) las entregas contra un contrato son parciales — se va cumpliendo con varias ventas a medida que sale cosecha, no una sola entrega; (2) las trilladoras NO dan anticipo en dinero al firmar, solo se paga al entregar (así que no hace falta un concepto de "anticipo de venta", más simple que los `Anticipo` a proveedores); (3) el vencimiento del contrato es solo informativo, nunca bloquea ni cancela nada automáticamente — lo decide el operador.

- **Schema**: nuevo modelo `ContratoVenta` (código `CTR-{año}-{secuencial}`, comprador, tipo de café, `cantidadKgPactada`/`cantidadKgEntregada`, `precioKg` fijo, `fechaLimite` opcional, `estado`: VIGENTE/CUMPLIDO/CANCELADO) + `Venta.contratoVentaId` opcional. Migración `20260710203417_contratos_venta_anticipada`. Agregado a `TENANT_SCOPED_MODELS` y `AUDITED_MODELS`.
- **Backend** (`src/modules/ventas/contratos-venta.{service,controller}.ts`, permisos `VENTAS_*` reutilizados, sin permisos nuevos):
  - `POST /contratos-venta` — crea el contrato en VIGENTE.
  - `GET /contratos-venta`, `GET /contratos-venta/:id` — cada contrato devuelve `saldoPendienteKg` y `vencido` **calculados al vuelo** (no se persisten), coherente con la decisión de que el vencimiento es solo informativo.
  - `PATCH /contratos-venta/:id/cancelar` — solo si está VIGENTE.
  - **`VentasService.create()` extendido**: `CreateVentaDto.contratoVentaId` opcional. Si se manda, `tipoCafe`/`precioKg`/`compradorId`/`compradorNombre` se **derivan del contrato del lado del servidor** (el cliente no los controla, así el precio queda de verdad bloqueado) y se valida que `cantidadKg` no exceda el saldo pendiente del contrato — independiente de la validación de stock físico disponible, que sigue aplicando igual. Dentro de la misma transacción que crea la venta, incrementa `cantidadKgEntregada` del contrato y lo marca `CUMPLIDO` si llega a completarse.
  - Verificado con curl: contrato de 20kg cumplido con dos entregas parciales (12+8) tomando el precio del contrato sin que el cliente lo mande, transición automática a CUMPLIDO, rechazo de venta contra contrato ya cumplido/cancelado, rechazo por exceder saldo del contrato (independiente del rechazo por falta de stock físico, probado por separado), y cancelación de contrato sin entregas.
- **Frontend**: `/ventas/contratos` (listado con badge de estado + "Vencido" si aplica), `/ventas/contratos/nuevo`, `/ventas/contratos/[id]` (resumen, saldo, historial de entregas con link a cada venta, botón cancelar, botón "Registrar entrega" que lleva a `/ventas/nueva?contratoVentaId=...`). `/ventas/nueva` ahora tiene un selector de contrato opcional al inicio del formulario: al elegir uno, bloquea (deshabilita) tipo de café, comprador y precio, y limita la cantidad al saldo pendiente — la venta libre (sin contrato) sigue funcionando exactamente igual que antes.

### Pendiente / fuera de alcance
- Sin anticipo de venta (dinero que entra del comprador) — decisión explícita del usuario, no aplica a su operación.
- El contrato no valida que haya stock disponible al momento de crearlo (es normal: se pactan contratos antes de tener el café listo) — la validación de stock ocurre en cada venta/entrega individual, como cualquier venta normal.
- No hay recordatorio/notificación de contratos por vencer — el campo `vencido` es visible en la UI pero pasivo, no genera alertas todavía (mismo patrón que las notificaciones in-app pendientes del resto del sistema).

## Exportar Excel en Reportes + sesión más larga con refresh silencioso (sesión 2026-07-10)

Dos pedidos puntuales del usuario:

**1. Exportar a Excel desde Reportes**: `GET /reportes/exportar` (`REPORTES_EXPORTAR`) genera un `.xlsx` real con `exceljs` (nueva dependencia en `apps/api`), no un CSV renombrado. 6 hojas: Resumen (KPIs + filtros aplicados), Compras por tipo, Ventas por tipo, Inventario actual, Saldo proveedores (con fila de total), y Detalle de compras (recepciones fila por fila, igual que el CSV existente pero dentro del mismo archivo). Reutiliza `ReportesService.dashboard()` para no duplicar la lógica de agregación. Frontend: botón "Exportar a Excel" junto al CSV existente (renombrado "Detalle de compras (CSV)" para diferenciarlos), mismo patrón fetch+blob+descarga. Verificado con curl: el archivo descargado es un `.xlsx` válido (`file` lo reconoce como "Microsoft Excel 2007+") con las 6 hojas esperadas.

**2. Sesión demasiado corta**: el usuario reportó que lo sacaba a los ~15 min estando activo (cargando recepciones). Causa: el access token duraba 15 min y el frontend nunca usaba el refresh token que ya emitía el backend — solo lo guardaba para el logout. Arreglado sin tocar el modelo de seguridad (el access token sigue siendo corto a propósito):
- `lib/api.ts`: cualquier request que reciba 401 ahora intenta renovar con `POST /auth/refresh` usando el refresh token guardado, y si funciona reintenta la petición original una vez — todo transparente para el usuario. Con múltiples peticiones 401 casi simultáneas (ej. volver de segundo plano), se comparte un único intento de refresh en vuelo (`refreshInFlight`) para no pisarse el refresh token, que es de un solo uso. Si el refresh también falla (token vencido/revocado — a los 30 días de inactividad real), dispara un evento `auth:session-expired` que `AuthProvider` escucha para limpiar la sesión y mandar a `/login`.
- `lib/auth.tsx`: ya no maneja el refresh token por su cuenta, usa los helpers centralizados de `api.ts` (`getRefreshToken`/`setRefreshToken`/`clearRefreshToken`).
- Backend: `JWT_ACCESS_EXPIRES_IN` subido de 15 a 30 min (colchón adicional, la renovación automática es el arreglo real). Plataforma (panel de super-admin) no tiene refresh token propio — es uso interno poco frecuente — así que en cambio se le subió el token a 8h (`JWT_PLATFORM_EXPIRES_IN`, nuevo). Verificado con curl: token de tenant dura 1800s, token de plataforma 28800s, y `/auth/refresh` rota correctamente el access+refresh token.
- **Resultado esperado**: mientras el usuario tenga la pestaña abierta y siga usando la app (cualquier petición dispara la renovación si hace falta), la sesión no debería cortarse antes de los 30 días del refresh token. Solo se cierra sesión si el refresh también está vencido/revocado.

## Rediseño visual del frontend (sesión 2026-07-10, con skill de diseño UI/UX)

A petición del usuario: mejorar el diseño en general + detalle puntual del ojo para mostrar/ocultar contraseña. Alcance: solo visual/UX, sin cambios de backend ni de flujos.

- **Tokens** (`app/globals.css`, `tailwind.config.ts`): el color primario café/terracota ya existía (buena base) pero los neutrales eran fríos (slate) y desentonaban — ahora toda la paleta es "warm" y coherente. Se agregaron tokens `success`/`warning` (antes solo había `destructive`).
- **Primitivas nuevas** en `components/ui/`: `Badge` (estados con color semántico), `PasswordInput` (toggle mostrar/ocultar con iconos `Eye`/`EyeOff` de `lucide-react`, que ya estaba en dependencias), `Table`/`TableHeader`/`TableRow`/`TableCell`/`TableEmpty` (header, hover de fila, y empty state consistentes en todos lados). `Button`/`Input`/`Select` pulidos (focus rings, transiciones, cursor-pointer, feedback de presión).
- **Sidebars** del dashboard del tenant y del panel de plataforma rediseñados con iconos por sección (lucide), estado activo con acento de color, avatar con iniciales, logout como botón de ícono.
- **Barrido completo** de los ~16 listados con tabla en toda la app (proveedores, recepción×2, bodega×3, pagos×2, ventas×2, configuración×2, plataforma×2, facturación, reportes×2): tablas raw → componente `Table`; texto plano de estado ("Activo"/"Pendiente"/etc.) → `Badge`. Helper compartido `lib/badge-variants.ts` para mapear tipo de café → color de badge de forma consistente.
- **Toggle de contraseña** aplicado en los 4 formularios que la piden: login de tenant, login de plataforma, crear usuario (`/configuracion/usuarios`), crear tenant (`/platform/tenants/nuevo`).
- Corregido de paso: `/recepcion/precios` tenía un texto desactualizado ("solo aplica a café mojado") que quedó mal después de la corrección de dominio de la sesión anterior (ahora dice pergamino).
- Verificado con `next build` limpio y arrancando el dev server real (curl a todas las rutas → 200, HTML de `/login` confirmado con el nuevo copy y el botón "Mostrar contraseña" presente). **No se probó visualmente en navegador** — sigue sin haber herramienta de automatización de navegador en este entorno; toda la verificación fue a nivel de build/HTML/tipos, no de captura visual.

## Fase actual (según cronograma en `docs/doc.md` §7.2)

**FASE 2: Desarrollo del MVP — Sprint 3-4**

Terminado: autenticación/usuarios, Proveedores, Recepción (con tabla de precios, catálogo de defectos, y compra directa de pergamino seco), Bodega (inventario, secado, trilla, destino de pasilla), Pagos (anticipos, pagos, conciliación manual, estado de cuenta), Plan/límites por tenant + panel de super-admin + Configuración (puntos de compra, usuarios, roles), Ventas (compradores, venta con trazabilidad de lotes de origen, descuento de inventario), Reportes (dashboard con los 4 KPIs prioritarios + exportación CSV), Facturación electrónica (ciclo completo crear/emitir/anular con adaptador enchufable, sin conector real todavía — decisión explícita del usuario), fix de bugs estructurales que bloqueaban TODO módulo tenant-scoped.
**Los 8 módulos de negocio del MVP original ya están implementados.** Lo que queda es: (a) conectar un proveedor tecnológico real de facturación (Factus/Siigo) el día que el usuario decida cuál — no requiere rediseño, ver sección de Facturación más abajo; (b) pulido/QA visual en navegador real (nunca se probó, no hay herramienta de automatización disponible en este entorno); (c) mejoras menores documentadas como "Pendiente" en cada módulo.

## Fase 1 — Planificación y Diseño: COMPLETA

- Documento de negocio (`docs/doc.md`) y decisiones de arquitectura (`docs/requerimientos.md`) cerrados.
- Schema de Prisma completo (`apps/api/prisma/schema.prisma`, 885 líneas).
- Migración inicial aplicada: `apps/api/prisma/migrations/20260709213548_init_schema`.

## Fixes estructurales (sesión del módulo Proveedores — siguen vigentes)

Antes de esa sesión, **ningún módulo tenant-scoped había sido probado end-to-end**. Se encontraron y corrigieron 4 bugs reales, documentados en detalle en el historial de git (commit "Implementa módulo de Proveedores y corrige bugs..."):

1. Guards (`JwtAuthGuard`/`PermissionsGuard`) nunca registrados globalmente — corregido en `app.module.ts` vía `APP_GUARD`.
2. Errores de tipos de Prisma preexistentes que rompían `pnpm build` — corregido (patrón: `tenantId` explícito desde `@CurrentUser('tenantId')`, `import type` para `TenantPrismaClient`).
3. Bug estructural de NestJS: `TENANT_PRISMA` (request-scoped) se instanciaba antes de que corrieran los guards. Corregido en `tenant-prisma.provider.ts` verificando el JWT de forma independiente.
4. Fuga de `passwordHash` en `/users` — corregido con `select` explícito.

Estos 4 fixes son la base que hace posible que Proveedores y Recepción funcionen; cualquier módulo nuevo debe seguir el mismo patrón (ver ejemplos en `proveedores.service.ts` y `recepcion.service.ts`).

## Corrección de dominio en Recepción (sesión 2026-07-10, corrige diseño original)

El diseño original (ver Fase 1) le pedía humedad + factor de rendimiento al café **MOJADO** (recién despulpado y lavado) y usaba esos datos para matchear la tabla de precios. Es un error de dominio: el rango de humedad de referencia (10-12%) es el de café **seco**, no el de mojado recién lavado — no tiene sentido medirle humedad a algo que acaba de salir del lavado. Corregido:

- **MOJADO**: ahora precio directo negociado (como pasilla), sin análisis de calidad. Su valor real se sabe después, al secarlo y trillarlo en Bodega.
- **PERGAMINO** (nuevo tipo de recepción, `TipoCafeRecepcion.PERGAMINO`): compra directa de café que el proveedor ya secó por su cuenta. Aquí es donde ahora vive la lógica de humedad + factor de rendimiento + tabla de precios que antes (por error) tenía mojado. Entra a inventario de PERGAMINO directamente (sin pasar por proceso de secado), con `OrigenMovimientoInventario.RECEPCION` — el pergamino que sí se seca en Bodega sigue generando su movimiento con `OrigenMovimientoInventario.PROCESO_SECADO`; el stock es agregado, no distingue origen.
- Migración `20260710154945_pergamino_recepcion_directa` (solo agrega el valor al enum, sin tocar datos existentes).
- Decisión actualizada en `docs/requerimientos.md` (sección "Estados de bodega/conversión").

## Plan/límites por tenant + panel de super-admin (sesión 2026-07-10)

A pedido del usuario: cada tenant es un negocio separado (multi-tenancy ya lo garantizaba), pero faltaba la forma de **administrar cuántos usuarios/puntos de compra puede tener cada uno** y una pantalla para gestionarlo sin tocar la API a mano.

- **Schema**: nuevo modelo `Plan` (`nombre`, `maxUsuarios`, `maxPuntosCompra` nullable = sin límite) + `Tenant.planId` nullable. Migración `20260710155418_plan_tenant_limits`. No es un sistema de facturación/cobro, solo control de acceso — no hay precio ni ciclo de facturación en el modelo.
- **Backend** (`src/modules/platform`): `GET/POST /platform/planes`, `PATCH /platform/planes/:id`; `PATCH /platform/tenants/:id` para asignar plan y cambiar `estado` (ACTIVO/SUSPENDIDO/PRUEBA); `POST /platform/tenants` acepta `planId` opcional. `GET /platform/tenants` incluye el plan y los conteos de usuarios/puntos de compra.
- **Enforcement de límites**: `UsersService.create()` y `PuntosCompraService.create()` rechazan con 400 si el tenant tiene plan asignado y ya alcanzó `maxUsuarios`/`maxPuntosCompra`. Un tenant sin plan asignado no tiene límite.
- **Suspensión real**: `AuthService.login()` y `.refresh()` ahora rechazan con 401 si `tenant.estado === SUSPENDIDO` — antes de este cambio, suspender un tenant desde plataforma no tenía ningún efecto real. Igual que con `user.activo`, esto solo se verifica en login/refresh (no en cada request, el access token de 15 min sigue siendo válido hasta expirar — mismo modelo de seguridad que ya existía para usuarios inactivos).
- **Frontend — panel de plataforma** (`app/platform/*`, fuera del grupo `(dashboard)`): auth completamente separada de la del tenant (`lib/platform-auth.tsx` + `lib/platform-api.ts`, storage keys propios `coffee-manager:platform:*`, login en `/platform/login`). `/platform` lista tenants con plan/estado/conteos y permite cambiar plan (select inline) y suspender/activar (botón inline); `/platform/tenants/nuevo` crea tenant + admin + plan opcional; `/platform/planes` lista y crea planes.
- **Frontend — Configuración del tenant** (`app/(dashboard)/configuracion/*`, ya no es placeholder): página principal muestra el plan actual y uso (usuarios/puntos de compra vs. límite, vía `GET /tenants/me` ampliado con `plan` + `_count`); `/configuracion/puntos-compra` crea y activa/desactiva puntos de compra; `/configuracion/usuarios` crea usuarios (con selección de roles y punto de compra) y activa/desactiva; `/configuracion/roles` crea roles y edita sus permisos con un grid agrupado por módulo (el rol "Administrador" es fijo, no editable — ya validado en el backend).
- `packages/shared-types` ampliado con `EstadoTenant`, `Plan`, `PlatformTenant`, `Role`, `RolePermissionEntry`, `User`, `UserRoleAssignment`, `TenantSelf`.

Verificado end-to-end con curl: creación de plan, asignación a tenant, bloqueo del 2do punto de compra al alcanzar el límite, permiso del 2do usuario y bloqueo del 3ro, suspensión de tenant seguida de login rechazado (401) y reactivación seguida de login exitoso.

### Pendiente / fuera de alcance de esta pasada
- No hay facturación/cobro real de planes (es solo control de acceso, como se acordó con el usuario).
- El panel de plataforma no tiene edición de tenant más allá de plan/estado (nombre, NIT, etc. no editables desde ahí todavía).
- `/configuracion/puntos-compra` no permite editar dirección/teléfono después de creado, solo activar/desactivar (alcance reducido a propósito, ver nota de la sesión).
- El límite de plan solo se aplica a usuarios y puntos de compra — no hay límite de recepciones/almacenamiento ni nada de eso (no se pidió).

## Backend (`apps/api` — NestJS + Prisma)

### Implementado
- Multi-tenancy: extensión de Prisma con scoping automático por `tenantId` (`src/prisma/extensions/tenant-scoping.extension.ts`).
- **Auth**: login + refresh token JWT (`src/modules/auth`).
- **Users + Roles**: CRUD de usuarios, roles con permisos granulares M2M (`src/modules/users`).
- **Platform**: super-admin de plataforma — login propio, CRUD de tenants (con plan y estado) y CRUD de planes (`src/modules/platform`).
- **Tenants**: configuración de empresa (NIT, resolución DIAN), `GET /tenants/me` con plan+conteos, y puntos de compra con límite por plan (`src/modules/tenants`).
- **Proveedores**: CRUD completo (`src/modules/proveedores`) — crear/listar/buscar/filtrar/editar/desactivar/reactivar, validación de duplicados.
- **Calidad**: `GET /calidad/defectos-tipo` — catálogo global de defectos (Cenicafé/FNC), usado por Recepción.
- **Recepción** (`src/modules/recepcion`) — módulo completo (ver corrección de dominio más abajo, sesión 2026-07-10):
  - `POST /tabla-precios`, `GET /tabla-precios?fecha=` — tramos de precio por factor de rendimiento + humedad (precio absoluto por kg, vigente por fecha, opcionalmente por punto de compra). Solo aplica a recepciones de PERGAMINO.
  - `POST /recepcion` — crea una recepción PERGAMINO (con `AnalisisCalidad` + defectos anidados en la misma transacción, factor de rendimiento calculado o manual, matcheo automático del tramo de precio vigente según humedad+factor) o MOJADO/PASILLA (precio directo negociado, sin análisis de calidad). Genera código correlativo `REC-{año}-{secuencial}` por tenant.
  - `GET /recepcion` (filtros: proveedor, punto de compra, tipo, rango de fechas), `GET /recepcion/:id` (detalle completo).
  - **Alcance deliberadamente limitado en esta pasada**: no hay `PATCH`/`DELETE` de recepciones (son registros financieros — editarlas requiere recalcular inventario/pagos/facturas asociados, se deja para cuando existan esos módulos). Tampoco hay generación de PDF del recibo todavía.
- **Bodega** (`src/modules/bodega`) — módulo completo:
  - `GET /bodega/inventario` — stock agregado por punto de compra + tipo de café, calculado en vivo desde el ledger `MovimientoInventario` (no es una tabla de saldos cacheada).
  - `POST /bodega/secado`, `GET /bodega/secado`, `GET /bodega/secado/:id`, `PATCH /bodega/secado/:id/finalizar` — agrupa una o más recepciones MOJADO (cada una se consume completa, no hay aporte parcial en el MVP), las marca `EN_PROCESO`, y al finalizar con el peso seco resultante calcula el % de rendimiento de secado y genera inventario de PERGAMINO.
  - `POST /bodega/trilla`, `GET /bodega/trilla`, `GET /bodega/trilla/:id` — consume pergamino disponible (valida que haya stock suficiente antes de crear) y genera almendra + rendimiento.
  - `PATCH /bodega/pasilla/:recepcionId/destino` — decide el destino de una recepción de pasilla (MEZCLA con pergamino, generando el movimiento de traspaso; o VENTA_SEPARADA, sin movimiento adicional). Solo se puede decidir una vez.
  - **Gap encontrado y corregido de paso**: `RecepcionService.create()` no generaba ningún `MovimientoInventario` — el módulo de Bodega no habría tenido datos reales sin esto. Ahora cada recepción (mojado o pasilla) genera su entrada de inventario en la misma transacción.
- **Pagos** (`src/modules/pagos`) — módulo completo, tres sub-recursos sobre los modelos `Anticipo`/`Pago`/`ConciliacionAnticipo` (ya existían en el schema):
  - `POST /anticipos`, `GET /anticipos`, `GET /anticipos/:id` — anticipo a proveedor como transacción independiente (efectivo/transferencia/cheque; **CREDITO rechazado** con 400, un anticipo siempre es un movimiento de caja real). El detalle calcula `montoConciliado`/`saldoDisponible` en vivo a partir de sus conciliaciones.
  - `POST /pagos`, `GET /pagos`, `GET /pagos/:id` — pago a proveedor, con atajo opcional `recepcionId` para asociarlo a una compra puntual (valida que la recepción sea del mismo proveedor). `metodoPago=CHEQUE` exige `numeroCheque` (`ValidateIf` en el DTO). `metodoPago=CREDITO` sí es válido aquí: es informativo, marca la compra como deuda pendiente sin mover caja real.
  - `POST /conciliaciones`, `GET /conciliaciones` — aplica manualmente un anticipo contra una recepción y/o un pago (exige al menos uno de los dos), valida que ambos pertenezcan al mismo proveedor que el anticipo, y que `montoAplicado` no supere el saldo disponible del anticipo (recalculado sumando sus conciliaciones previas).
  - `GET /pagos/cuenta/:proveedorId` — estado de cuenta informativo del proveedor (total comprado, pagado en efectivo/transferencia/cheque, marcado como crédito, anticipado, conciliado, sin conciliar, saldo pendiente estimado). **No es un saldo autoritativo**: es una vista de solo lectura sobre las transacciones independientes; la reconciliación real la hace el operador a mano (decisión de arquitectura en `requerimientos.md`, "Anticipos a proveedores").
  - Sin `PATCH`/`DELETE` en ningún sub-recurso — mismo alcance deliberadamente limitado que Recepción (son registros financieros).
  - `Pago`, `Anticipo`, `ConciliacionAnticipo` ya estaban en `AUDITED_MODELS` (`audit-log.extension.ts`), así que quedan auditados automáticamente sin código adicional — verificado con una query directa a `AuditLog`.
- **Ventas** (`src/modules/ventas`) — módulo completo, dos sub-recursos:
  - **Compradores**: CRUD simple (`crear/listar/ver/editar` — sin `createdById`, el modelo no lo tiene) para reutilizar compradores frecuentes; `Venta.compradorNombre` siempre queda como texto libre (copiado del comprador seleccionado o escrito a mano), `compradorId` es opcional.
  - **Ventas**: `POST /ventas` — vende un `tipoCafe` (`TipoInventario`: MOJADO/PERGAMINO/ALMENDRA/PASILLA) de un punto de compra. Valida stock disponible con `BodegaService.getStockDisponible()` (mismo helper que usa Trilla), genera código `VTA-{año}-{secuencial}`, y en la misma transacción crea la `Venta`, sus `VentaLoteOrigen` (trazabilidad hacia las recepciones de origen) y el `MovimientoInventario` de SALIDA con `origen=VENTA`.
  - **Validación de trazabilidad**: la suma de `lotesOrigen[].cantidadKgAtribuida` debe coincidir con `cantidadKg` de la venta (tolerancia de redondeo 0.01 kg) — rechazada con 400 si no cuadra. Las recepciones referenciadas solo se validan por existencia/tenant, no por tipo: la trazabilidad se detiene a nivel de recepción por decisión de diseño (no se rastrea el camino secado/trilla → recepción original, ver `requerimientos.md`).
  - `GET /ventas` (filtros: punto de compra, comprador, tipo, rango de fechas), `GET /ventas/:id` (detalle con lotes de origen).
  - Sin `PATCH`/`DELETE` — mismo alcance deliberadamente limitado que Recepción/Pagos (registros que tocan inventario).
  - `VentasModule` importa `BodegaModule` para inyectar `BodegaService` (patrón: un módulo de negocio dependiendo de otro vía `imports`, primera vez que se usa así en este backend).
- **Reportes** (`src/modules/reportes`) — módulo completo, los 4 KPIs prioritarios de `requerimientos.md` más un par de agregados que ya eran gratis con los datos existentes:
  - `GET /reportes/dashboard?puntoCompraId=&desde=&hasta=` — compras por período (agrupadas por tipo de café, con kg/valor/conteo), ventas por período (igual), margen bruto del período (ventas − compras, simple, no es rentabilidad por lote), calidad promedio comprada (humedad y factor de rendimiento promedio, **solo sobre recepciones de PERGAMINO** porque son las únicas con análisis de calidad desde la corrección de dominio), inventario actual (reutiliza `BodegaService.getInventario()`), y saldo pendiente estimado a proveedores (top 10 + total, misma fórmula que `PagosService.estadoCuenta` pero calculada en lote con `groupBy` para todos los proveedores en una sola pasada en vez de N llamadas).
  - **Nota de filtrado**: `desde`/`hasta` solo acotan compras/ventas/calidad (son flujos de un período); inventario y saldo pendiente son estado actual, no tienen sentido filtrados por fecha, así que siempre reflejan el momento presente.
  - `GET /reportes/compras/exportar?...` — exporta CSV de las recepciones del período (mismo filtro), gated tras el permiso `REPORTES_EXPORTAR` (separado de `REPORTES_VER`). Usa `@Res()` de Express directamente para poder mandar `Content-Type: text/csv` y `Content-Disposition: attachment`.
  - `ReportesModule` importa `BodegaModule` (mismo patrón que `VentasModule`).
- **Facturación** (`src/modules/facturacion`) — módulo completo con patrón adaptador, a petición explícita del usuario ("que quede lista solo si en algún momento se quiere conectar"):
  - **`adapters/facturacion-provider.interface.ts`**: contrato `FacturacionProviderAdapter` (`emitir()`/`anular()`) que debe implementar cualquier conector real.
  - **`adapters/ninguno.provider.ts`**: implementación por defecto (única registrada hoy) — **no simula una emisión**, rechaza con `BadRequestException` y un mensaje explícito de que no hay proveedor conectado. Decisión deliberada: mejor fallar claro que generar un CUFE falso.
  - **`adapters/facturacion-provider.factory.ts`**: resuelve el adapter según `Factura.proveedorTecnologico`. Conectar Factus/Siigo el día de mañana es: crear una clase que implemente la interfaz + agregarla a los providers de `FacturacionModule` + un `case` nuevo en el factory — **no toca `FacturacionService` ni el resto del módulo**.
  - `POST /facturacion` — crea el registro en `PENDIENTE` para una recepción (1:1, rechaza duplicados).
  - `POST /facturacion/:id/emitir` — resuelve el adapter y lo invoca; con el adapter `NINGUNO` esto siempre falla (por diseño) y deja la factura en estado `ERROR`. Cuando se conecte un proveedor real, este mismo endpoint empieza a funcionar sin cambios.
  - `POST /facturacion/:id/anular` — solo si `estado=EMITIDA` y tiene `cufe`.
  - `GET /facturacion`, `GET /facturacion/:id` (filtros: punto de compra, estado).
  - **Deliberadamente fuera de alcance**: no hay CRUD de `ResolucionFacturacion` (la resolución/rango de numeración DIAN) — no aporta nada mientras no haya un proveedor real emitiendo, se construye junto con el conector real.
  - `Factura` ya estaba en `AUDITED_MODELS`, queda auditada automáticamente.
- **Audit log**: registro de cambios en módulos sensibles (`src/common/audit`).
- Guards: `JwtAuthGuard`, `PermissionsGuard`, `PlatformAuthGuard` — registrados globalmente.

Todo lo anterior verificado end-to-end con curl: creación de tramo de precio, recepción de pergamino con factor calculado/manual y defectos, recepción de mojado y pasilla a precio directo (sin análisis de calidad, rechazadas si falta `precioKg`), error claro cuando no hay tramo vigente para pergamino, aislamiento entre tenants, caso de permisos denegados (403), la cadena completa mojado→secado→pergamino→trilla→almendra + pasilla→mezcla→pergamino con sus validaciones (recepción duplicada en secado, stock insuficiente para trilla, destino ya decidido), el ciclo anticipo→pago→conciliación→estado de cuenta con sus validaciones (anticipo con CREDITO rechazado, cheque sin número rechazado, conciliación que excede el saldo disponible rechazada, conciliación sin recepción ni pago rechazada), venta de pergamino comprado directo con descuento real de inventario (100kg → 40kg tras vender 60kg), rechazando suma de lotes que no cuadra y cantidad que excede el stock disponible, el dashboard de reportes con sus 5 bloques (compras/ventas por tipo, margen del período, calidad promedio, inventario, saldo pendiente) devolviendo ceros correctamente cuando el rango de fechas no tiene datos pero manteniendo inventario/saldo (que no son de período) más la exportación CSV, y el ciclo de facturación completo (crear → duplicado rechazado → emitir sin proveedor rechazado con mensaje claro y la factura queda en ERROR → anular una factura no emitida rechazado).

### Módulos de negocio: todos implementados
Los 8 módulos definidos en `docs/requerimientos.md` ("Estado por módulo") tienen backend y frontend funcionando: Auth/Usuarios, Proveedores, Recepción y Calidad, Bodega, Ventas, Pagos, Facturación (sin conector real, ver arriba) y Reportes. No queda ningún scaffold vacío en `apps/api/src/modules`.

## Frontend (`apps/web` — Next.js)

### Implementado
- Cliente API (`lib/api.ts`) y autenticación (`lib/auth.tsx`) con sesión en `localStorage`.
- Login real, layout de dashboard protegido, componentes UI base sin Radix (`components/ui/`).
- **Módulo Proveedores completo**: listado con búsqueda/filtro, alta, edición, validado con Zod compartido (`packages/validation-schemas`).
- **Módulo Recepción completo**:
  - `app/(dashboard)/recepcion/page.tsx` — listado con montos formateados en COP.
  - `app/(dashboard)/recepcion/nueva/page.tsx` — formulario con toggle Mojado/Pergamino seco/Pasilla, selects de proveedor/punto de compra (poblados desde la API), campos condicionales de calidad (humedad, factor calculado con preview en vivo o manual, defectos con selector del catálogo) solo para Pergamino, campo de precio directo para Mojado/Pasilla.
  - `app/(dashboard)/recepcion/[id]/page.tsx` — detalle de solo lectura.
  - `app/(dashboard)/recepcion/precios/page.tsx` — alta y listado de tramos de precio del día.
  - **Nota de diseño**: este formulario usa estado local (`useState`) en vez de react-hook-form+Zod compartido como Proveedores, porque los campos condicionales (mojado vs. pasilla, factor calculado vs. manual, lista dinámica de defectos) son más simples de manejar así dado el tiempo disponible. La validación fina vive en el backend; el frontend hace solo validación básica de campos requeridos y muestra los errores del servidor.
- **Módulo Bodega completo**:
  - `app/(dashboard)/bodega/page.tsx` — inventario actual y lista de pasillas pendientes de decidir destino (con botones de acción directa).
  - `app/(dashboard)/bodega/secado/page.tsx` + `.../nuevo` + `.../[id]` — listado, alta (selección múltiple de recepciones mojado disponibles por punto de compra, con total en vivo) y detalle con acción de finalizar.
  - `app/(dashboard)/bodega/trilla/page.tsx` — listado y alta en una sola página (como tabla de precios), con preview en vivo del rendimiento.
- **Módulo Pagos completo**:
  - `app/(dashboard)/pagos/page.tsx` — listado de pagos con enlaces a "Estado de cuenta", "Anticipos" y "Nuevo pago".
  - `app/(dashboard)/pagos/nuevo/page.tsx` — formulario de pago; al elegir proveedor carga sus recepciones para el atajo opcional `recepcionId`; campo `numeroCheque` condicional cuando el método es CHEQUE.
  - `app/(dashboard)/pagos/anticipos/page.tsx` + `.../nuevo` — listado y alta de anticipos (selector de método de pago limitado a efectivo/transferencia/cheque, sin CREDITO).
  - `app/(dashboard)/pagos/anticipos/[id]/page.tsx` — detalle del anticipo (monto/conciliado/saldo disponible) con formulario de conciliación inline (contra recepción o contra pago del mismo proveedor, con `max` del input acotado al saldo disponible); se oculta el formulario cuando el saldo llega a cero.
  - `app/(dashboard)/pagos/cuenta/page.tsx` — selector de proveedor + tarjetas KPI con el estado de cuenta (`GET /pagos/cuenta/:id`), con nota explícita de que el saldo es estimado/informativo, no autoritativo.
- **Panel de super-admin** (`app/platform/*`) y **Configuración del tenant** (`app/(dashboard)/configuracion/*`) — ver detalle completo en la sección "Plan/límites por tenant + panel de super-admin" más arriba.
- **Módulo Ventas completo**:
  - `app/(dashboard)/ventas/page.tsx` — listado con montos formateados en COP.
  - `app/(dashboard)/ventas/nueva/page.tsx` — formulario con select de punto de compra + tipo de café (con stock disponible en vivo desde `/bodega/inventario`), comprador guardado opcional (autocompleta el nombre libre) o nombre escrito a mano, y un constructor de "lotes de origen" (selecciona recepciones del punto de compra elegido y les atribuye kg, con la suma en vivo vs. la cantidad total vendida).
  - `app/(dashboard)/ventas/[id]/page.tsx` — detalle de solo lectura con lotes de origen.
  - `app/(dashboard)/ventas/compradores/page.tsx` — alta y listado de compradores, activar/desactivar (mismo patrón que puntos de compra).
  - Nuevo ítem de navegación "Ventas" en el layout del dashboard.
- **Módulo Reportes completo**: `app/(dashboard)/reportes/page.tsx` — filtros de punto de compra/rango de fechas aplicados con un botón explícito (no en cada tecleo, a propósito), tarjetas KPI (comprado/vendido/margen), desglose de compras y ventas por tipo de café, calidad promedio, tabla de inventario actual, tabla de saldo pendiente por proveedor con total, y botón de exportar CSV que dispara una descarga real del navegador (`fetch` + `Blob` + link temporal, ya que el cliente `api.ts` genérico solo maneja JSON).
- **Módulo Facturación completo**:
  - `app/(dashboard)/facturacion/page.tsx` — listado con aviso permanente de que no hay proveedor tecnológico conectado.
  - `app/(dashboard)/facturacion/nueva/page.tsx` — genera el registro para una recepción; el select solo ofrece recepciones sin factura (filtrado en el cliente cruzando `/recepcion` con `/facturacion`, el backend igual rechaza duplicados si se cuela alguna).
  - `app/(dashboard)/facturacion/[id]/page.tsx` — detalle con botón "Emitir factura" (visible si `PENDIENTE`/`ERROR`, muestra el error del backend tal cual cuando falla) y formulario "Anular" (visible solo si `EMITIDA`).
- `packages/shared-types` ampliado con `PuntoCompra`, `DefectoTipo`, `TablaPrecioTramo`, `AnalisisCalidad`, `DefectoAnalisis`, `Recepcion`, `CategoriaDefecto`, `EstadoProcesoSecado`, `InventarioItem`, `ProcesoSecado`, `TrillaProceso`, `Anticipo`, `AnticipoDetalle`, `Pago`, `ConciliacionAnticipo`, `EstadoCuentaProveedor`, `EstadoTenant`, `Plan`, `PlatformTenant`, `Role`, `RolePermissionEntry`, `User`, `UserRoleAssignment`, `TenantSelf`, `Comprador`, `Venta`, `VentaLoteOrigenItem`, `ReportesDashboard`, `ReportesCompraPorTipo`, `ReportesVentaPorTipo`, `ReportesSaldoProveedor`, `ProveedorTecnologicoFacturacion`, `Factura`.

### Pendiente
- Ningún módulo queda como placeholder — los 8 tienen pantallas reales.
- `register` ya no es placeholder — ver sección "Landing page pública + autorregistro con aprobación" más arriba (sesión 2026-07-10) para el estado actual.
- El refresh automático de token y el resto de detalles de sesión están documentados en la sección "Exportar Excel en Reportes + sesión más larga" más arriba (sesión 2026-07-10) — esta línea quedaba desactualizada de antes de ese arreglo.
- No se probó visualmente en un navegador real en ninguna sesión (no hay herramienta de automatización de navegador disponible) — se verificó con `next build`/`next lint` limpios, todas las rutas devolviendo 200, y las formas de datos del frontend confirmadas contra las respuestas reales de la API vía curl.
- Recepción: no hay impresión/PDF del recibo, ni edición/anulación de una recepción ya creada (ver nota de alcance en la sección de backend).
- Bodega/secado "nuevo": la lista de recepciones mojado disponibles no excluye del todo las que ya fueron usadas en otro proceso (el backend sí lo valida y rechaza con mensaje claro, pero la UI no las oculta de antemano).
- Pagos: no hay página de detalle de un pago individual (la lista ya muestra proveedor/recepción/método/monto, que cubre el caso de uso principal); tampoco hay filtros de fecha/proveedor en la UI de listados (el backend sí los soporta vía query params).
- Ventas: el selector de "lotes de origen" en `/ventas/nueva` lista todas las recepciones del punto de compra sin filtrar por tipo de café ni excluir las agotadas (la trazabilidad es informativa por diseño, ver nota de alcance en la sección de backend, pero la UI podría guiar mejor la selección).
- Reportes: el "margen bruto del período" es simple (total vendido − total comprado en el rango de fechas), **no es rentabilidad por lote** — no hay todavía un reporte que cruce `VentaLoteOrigen` con el `valorTotal` de la recepción de origen para ver el margen de un lote específico. Es factible con los datos que ya existen (`Recepcion.valorTotal` vs. la porción de `Venta.valorTotal` atribuible via `VentaLoteOrigen.cantidadKgAtribuida`), pero no se construyó en esta pasada.
- Facturación: **sin conector real** (Factus/Siigo) — decisión explícita del usuario, "que quede lista solo si en algún momento se quiere conectar". El ciclo crear→emitir→anular funciona de punta a punta a nivel de datos/estado, pero `emitir` siempre falla hasta que alguien implemente un provider real (ver sección de backend). Tampoco hay CRUD de `ResolucionFacturacion` (rango de numeración DIAN) — se construye junto con el conector real, no aporta nada antes.

## Cómo levantar el entorno de desarrollo

```bash
docker compose -f docker/docker-compose.yml up -d postgres
cd apps/api && pnpm exec prisma migrate deploy && pnpm exec prisma db seed
pnpm --filter api build && node apps/api/dist/src/main   # o: pnpm --filter api start:dev
pnpm --filter web dev   # http://localhost:3000
```

Para crear el primer tenant de prueba: entrar a `/platform/login` con `PLATFORM_ADMIN_EMAIL`/`PASSWORD` del seed (o `POST /platform/auth/login` por curl) y crear el tenant desde `/platform/tenants/nuevo` (o `POST /platform/tenants`). Puntos de compra, usuarios y roles ya se pueden crear desde `/configuracion` dentro del dashboard del tenant, no hace falta curl. Para poder crear una recepción de PERGAMINO hace falta un tramo de precio vigente para la fecha (`POST /tabla-precios` o la página `/recepcion/precios`) — mojado y pasilla no lo necesitan (precio directo).

## Cómo retomar en la próxima sesión

**Estado (2026-09-30): ejecutando el plan de `docs/TECNICO.md`. Sprint 0 casi cerrado.** Leer `CLAUDE.md` (reglas de dominio y de trabajo), la sección del sprint en `docs/TECNICO.md` y las 4 entradas "Sprint 0 · PR n" de arriba.

1. **Ramas locales encadenadas, sin push ni PR** (cada una parte de la anterior): `test/dominio-calidad-recepcion` → `feat/consecutivos-atomicos` → `test/dominio-pagos` → `ci/cobertura-y-lint` (la última contiene todo). `main` no se tocó. Decidir con el usuario cómo subirlas (¿un PR por rama encadenados, o uno solo?).
2. **Entorno de pruebas**: PostgreSQL en el contenedor `docker-postgres-1` dentro de WSL Ubuntu (puerto 5432, visible desde Windows). WSL se apaga sola y reinicia los contenedores: antes de probar, iniciar `wsl -e sleep infinity` en segundo plano y `wsl -e docker start docker-postgres-1`. BD de pruebas `coffee_manager_test` (con las migraciones aplicadas); integración: `DATABASE_URL=…/coffee_manager_test pnpm --filter api test:int`. Unitarias: `pnpm --filter api test:cov`. No correr `pnpm lint` suelto: usa `--fix` y reescribe archivos ajenos (usar `npx eslint … --no-fix`).
3. **Falta del Sprint 0**: PR 5 Sentry (esperando aprobación de dependencias `@sentry/nestjs` y `@sentry/nextjs` + DSN) y que el usuario active la protección de `main` en GitHub.
4. **Decisiones por confirmar con el usuario**: huecos en la numeración (consecutivo asignado antes de la transacción, ADR-003); orden/forma de los PRs.
5. **Deuda técnica registrada** (ver entradas del Sprint 0): auditoría no transaccional (`audit-log.extension.ts`, riesgo de bloqueo del pool y auditoría de transacciones revertidas — arreglar pronto), carrera en `ConciliacionesService` (sobre-aplicar anticipos), plata con `number` en vez de `Decimal`, `estadoCuenta` en memoria.
6. **Siguiente**: Sprint 1 (recepción rápida: `idempotencyKey`, `numeroSacos`, `Proveedor.apodo`, `pg_trgm`, pantalla nueva, 45 s). Parte con una migración expandir; no tocar `.env`.

### Referencias antiguas (MVP original)
1. Si hay dudas de diseño, revisar `docs/requerimientos.md`.
2. Los 8 módulos de negocio del MVP original ya están implementados (backend + frontend). Opciones fuera del plan: proveedor real de facturación (Factus/Siigo vía `FacturacionProviderAdapter`), QA visual en navegador (nunca hecho), rentabilidad por lote en Reportes, pulido menor de módulos.
3. Al terminar una sesión de trabajo, actualizar este archivo.
