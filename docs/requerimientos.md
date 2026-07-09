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
- **Estados de bodega/conversión** (confirmado con el usuario):
  - **Mojado**: café pergamino recién despulpado, aún no seco. Es lo que se le compra al caficultor en la línea principal.
  - **Pergamino (seco)**: resultado de secar el mojado en máquinas. El sistema debe:
    - Registrar peso comprado en mojado y peso resultante en seco por cada proceso de secado.
    - Calcular el % de rendimiento de secado (kg seco / kg mojado) de cada lote.
    - Mantener un promedio histórico de rendimiento de secado para proyectar cuánto café seco debería salir dado un peso de mojado comprado, y detectar desviaciones frente al promedio.
  - **Almendra**: resultado de trillar el pergamino seco (factor de rendimiento de trilla, ya cubierto en el módulo de calidad).
  - **Pasilla**: se compra **ya seca** directamente al proveedor (compra independiente, no se compra mojada, tiene su propio registro/precio en recepción). Después de comprada, tiene dos destinos posibles que el operador elige por lote: (a) se mezcla con el inventario de café pergamino, o (b) se vende por separado como pasilla. El modelo de bodega debe soportar ambos destinos por lote de pasilla.
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
