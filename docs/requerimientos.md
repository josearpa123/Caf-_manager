# Requerimientos Detallados

> Este documento se completará durante la fase técnica/funcional posterior al scaffold inicial (ver `docs/doc.md` para el contexto de negocio completo).

## Decisiones de arquitectura (confirmadas)

- **Multi-tenancy**: schema de Postgres compartido, cada tabla con columna `tenantId`. Todas las queries de Prisma se filtran por tenant.
- **Roles y permisos**: permisos granulares configurables por tenant (no roles fijos). Cada tenant puede definir roles propios y asignar permisos específicos por módulo/acción.
- **Cálculo de precio de compra**: cada tenant configura su propia tabla/escala de precios según rangos de factor de rendimiento y humedad (no una fórmula fija del sector). Requiere UI de configuración de tablas de precios desde el MVP.
- **Facturación electrónica DIAN**: decisión de proveedor (Factus vs Siigo) diferida. El módulo `facturacion` se diseñará con una interfaz/adaptador abstracto para poder conectar el proveedor más adelante sin rediseñar el módulo.
- **Unidad de medida base**: kilogramos en todo el modelo de datos y cálculos internos. La UI puede mostrar conversiones a arroba (12.5 kg) / carga (125 kg) como formato de visualización.
- **Multi-sucursal**: soportado desde el MVP. Se modela una entidad "Punto de Compra" (sucursal) por tenant desde el inicio, aunque la mayoría de tenants iniciales solo tengan uno.
- **Lote**: cada recepción individual de café a un proveedor genera su propio lote trazable (1 recepción = 1 lote). Consolidaciones/mezclas en bodega se modelan como un evento aparte, no como fusión de lotes.
- **Anticipos a proveedores**: se registran como transacciones independientes (anticipo, compra, pago) que el operador concilia manualmente. No hay descuento automático de saldo.
- **Factor de rendimiento**: soporta ambos modos por recepción — (a) calculado por el sistema a partir de peso de muestra + peso de almendra trillada, o (b) valor ingresado manualmente. El operador elige el modo al registrar la recepción.
- **Facturación electrónica**: se emite una factura por cada recepción/lote (1:1), no consolidada.
- **Métodos de pago**: efectivo, transferencia bancaria, cheque, crédito/cuenta por pagar.
- **Onboarding de tenants**: aprovisionamiento manual por el admin de la plataforma (sin self-service registration) para la fase de beta.
- **Estados de bodega/conversión** (revisado 2026-07-10, corrige la decisión original de la sesión de diseño):
  - **Mojado**: café recién despulpado y lavado, aún húmedo. Se compra a **precio directo negociado** (como pasilla) — no se le mide humedad ni factor de rendimiento en este punto, no tiene sentido hacerlo sobre café que acaba de salir del lavado. Su valor real se conoce después, al secarlo y trillarlo en Bodega.
  - **Pergamino (seco)**: café ya seco. Tiene **dos orígenes posibles**:
    (a) resultado de secar mojado en Bodega (proceso de secado, sin cambios: registra peso mojado/peso seco por lote, calcula % de rendimiento de secado, mantiene promedio histórico para proyectar);
    (b) **compra directa en Recepción** — un proveedor que ya secó su propio café por su cuenta lo vende como pergamino. Esta compra sí lleva análisis de calidad (humedad + factor de rendimiento) y pasa por la tabla de precios configurable, porque el rango de humedad de referencia (10-12%) es el de café seco — es la lógica que originalmente (por error) se le había puesto a la recepción de mojado.
  - **Almendra**: resultado de trillar el pergamino seco, sin importar su origen (secado o compra directa) — el stock de pergamino es agregado (factor de rendimiento de trilla, ya cubierto en el módulo de calidad).
  - **Pasilla**: se compra **ya seca** directamente al proveedor, a precio directo negociado (compra independiente, no se compra mojada, sin análisis de calidad). Después de comprada, tiene dos destinos posibles que el operador elige por lote: (a) se mezcla con el inventario de café pergamino, o (b) se vende por separado como pasilla. El modelo de bodega debe soportar ambos destinos por lote de pasilla.
- **Defectos de calidad**: catálogo tipificado de defectos (norma Cenicafé/FNC: negro, vinagre, brocado, vano, partido, etc.) con cantidad/porcentaje por tipo.
- **KPIs prioritarios del dashboard**: compras por período, saldo pendiente a proveedores, inventario actual en bodega, calidad promedio comprada.
- **Notificaciones**: solo dentro de la app en el MVP (sin email/WhatsApp por ahora).
- **Retención fiscal (autorretención cafetera)**: NO se calcula en el MVP. Se registra el valor bruto de la compra y el pago tal cual; el comprador maneja la retención aparte con su contador. Posible mejora futura.
- **Módulo de ventas**: SÍ incluido desde el MVP (no solo compras). Se necesita registrar ventas de café procesado (a trilladoras/exportadores) — comprador, precio, cantidad, lote(s) de origen — para poder calcular rentabilidad por lote.
- **Precio del día**: el comprador (o un admin) registra un precio base diario de referencia; el sistema lo ajusta automáticamente por calidad usando la tabla de precios configurable del tenant (ver arriba). No es negociación libre por transacción.
- **Datos obligatorios de proveedor (caficultor)**: identificación (cédula/NIT) + nombre, ubicación de finca (vereda/municipio), datos de contacto (teléfono/WhatsApp). Certificaciones (orgánico, FLO, etc.) quedaron fuera del MVP.
- **Ventas (detalle)**: una venta puede combinar café de varios lotes/recepciones (descuenta de inventario agregado por tipo/calidad, no lote por lote exacto, aunque conserva referencia a los lotes de origen para trazabilidad). Alcance MVP: registro simple (comprador, cantidad, precio, lotes de origen) para calcular rentabilidad — SIN factura electrónica ni control de método de pago todavía; eso se agrega en una fase posterior.
- **Auditoría**: log de cambios críticos — quién y cuándo creó/editó/eliminó registros en módulos sensibles (precios, pagos, recepciones, facturas). No se audita cada lectura ni cada campo de todos los módulos.
- **Configuración de empresa**: NIT/razón social/logo + resolución de facturación DIAN (número, rango, vigencia) + cada punto de compra (sucursal) con su propia dirección/teléfono para aparecer en recibos impresos.
- **Usuarios**: cada empleado (operador) tiene su propio usuario individual — no hay cuentas genéricas compartidas por punto de compra. Necesario para que el log de auditoría identifique quién hizo cada registro.
- **Rango de humedad aceptable**: configurable por tenant (igual que la tabla de precios), no fijo en 10-12% para todos.
- **Recibo de compra**: se genera como PDF/pantalla imprimible en cualquier impresora estándar o compartible por WhatsApp/email. No requiere integración con impresora térmica en el MVP.

## Decisiones técnicas del schema (resolviendo ambigüedades del diseño)

- **Roles por usuario**: un usuario puede tener VARIOS roles combinables (sus permisos se suman). Requiere tabla M2M `UserRole`, no un campo único `roleId`.
- **Acceso a puntos de compra**: un usuario accede a TODOS los puntos del tenant o a UNO específico (no a un subconjunto). No se modela M2M usuario↔puntos de compra en el MVP.
- **Método de pago "Crédito"**: es informativo — no es un movimiento de caja real, simplemente marca que esa compra queda como deuda pendiente con el proveedor hasta que se registre un pago real después.
- **Tabla de precios por calidad**: cada tramo define un **precio ABSOLUTO por kg** (no un ajuste +/- sobre un precio base). El "precio del día" se materializa como el conjunto de tramos vigentes ese día — el admin actualiza/versiona la tabla cuando cambian los precios (probablemente a diario), no existe un "precio base" separado que se ajuste.
- **Pasilla**: precio directo negociado por recepción (no pasa por la tabla de precios por calidad) y NO requiere análisis de calidad (no se le mide humedad ni factor de rendimiento) — solo se pesa y se registra.
- **Trazabilidad de bodega**: se detiene en el nivel de recepción (venta → recepciones de origen). NO se rastrea el camino completo trilla→secado→recepción original; no aporta valor suficiente para el esfuerzo de modelarlo en el MVP.
- **Notificaciones MVP**: único disparador para la primera versión: saldo pendiente alto a un proveedor (crédito + anticipos sin conciliar por encima de un umbral). Los demás disparadores propuestos (humedad fuera de rango, desviación de rendimiento de secado, inventario bajo) quedan fuera del MVP, se agregan después.
- **Panel de super-admin de plataforma**: SÍ se necesita desde ya (no basta con script/Prisma Studio). Requiere un modelo de administrador de plataforma completamente separado de los usuarios de tenant, con su propio login, para: listar tenants existentes y crear un tenant nuevo + su primer usuario administrador durante el aprovisionamiento manual de la fase beta.

## Estado por módulo

- [x] Arquitectura general (multi-tenancy, roles, unidad de medida, auditoría) — ver decisiones arriba
- [x] Módulo de Autenticación y Usuarios — usuario individual por empleado, permisos granulares configurables
- [x] Módulo de Proveedores (Caficultores) — campos obligatorios definidos, cuenta corriente vía transacciones independientes
- [x] Módulo de Recepción y Análisis de Calidad — factor de rendimiento (manual o calculado), defectos tipificados, humedad configurable, precio del día + tabla por calidad
- [x] Módulo de Conversión y Bodega — flujo mojado→pergamino→almendra, pasilla como compra independiente
- [x] Módulo de Ventas — incluido en MVP, registro simple, puede combinar varios lotes
- [x] Módulo de Pagos y Finanzas — métodos de pago definidos (efectivo/transferencia/cheque/crédito), sin retención fiscal automática
- [x] Módulo de Facturación Electrónica (DIAN) — proveedor diferido (adaptador abstracto), 1 factura por recepción/lote
- [x] Módulo de Reportes y Dashboard — KPIs prioritarios definidos, notificaciones solo in-app
- [x] Configuración de empresa — NIT/logo/resolución DIAN/puntos de compra
- [ ] Detalle fino a resolver durante construcción de cada módulo (ej. catálogo exacto de defectos, formato exacto de reportes exportados) — se define sobre la marcha sin bloquear el diseño del schema
