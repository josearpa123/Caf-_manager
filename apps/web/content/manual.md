# Manual de Coffee Manager

Este manual explica el sistema con palabras simples. Está escrito para quien compra café, no para quien programa. Si algo del sistema no coincide con lo que dice aquí, avísale a quien lo administra: este manual se actualiza con cada cambio.

> Si es tu primer día, lee solo "Por dónde empezar" y "Comprar café". Lo demás es para consultar cuando lo necesites.

## Cómo está organizado

El menú de la izquierda (en el celular, el botón de las tres rayitas) tiene tres grupos:

- **Comprar:** Recepción (comprar café), Proveedores (la lista de quienes te venden), Pagos (pagos y anticipos) y Préstamos.
- **Café:** Bodega (lo que tienes guardado), Ventas (lo que vendes) y Cortes (viajes).
- **Administración:** Facturación, Reportes, Configuración y Ayuda (este manual).

No tienes que usar todo. En **Configuración → "Qué quiero ver en el menú"** puedes quitar los módulos que tu negocio no usa. No se borra nada: es solo para que el menú sea más corto, y los puedes volver a mostrar cuando quieras.

## Por dónde empezar

Haz esto una sola vez, en este orden:

1. **Puntos de compra** (Configuración → Puntos de compra): crea cada sede o bodega donde recibes café. Si solo tienes una, el sistema la escoge solo en cada compra.
2. **Peso del saco** (Configuración → tarjeta "Recepción"): cuánto pesa un saco vacío, en kilos. Con ese dato el sistema calcula la tara solo.
3. **Cómo compras café seco** (misma tarjeta): escoge entre "Pago un precio por kilo" o "Mido humedad y factor". Es lo que aparece por defecto; en cada compra lo puedes cambiar.
4. **Precios del día**, solo si mides humedad y factor: Recepción → "Tabla de precios". Cada día hay que cargar los tramos de precio. Si no mides calidad, sáltate este paso.
5. **Retención en la fuente**, solo si tu negocio es agente de retención (mira "Retención en la fuente" más abajo). Si no lo eres, déjala apagada.
6. **Proveedores:** no necesitas cargarlos todos. Puedes crear uno nuevo en plena compra, con solo el nombre y la cédula.

## Comprar café (Recepción)

Entra a **Recepción** y oprime **Nueva recepción**. Es una sola pantalla. Con el teclado: **Enter** pasa al siguiente campo y, en el último, guarda.

1. **Proveedor.** Escribe parte de la cédula, el nombre o el apodo. Aparecen coincidencias mientras escribes; muévete con las flechas y escoge con **Enter**. No importan las tildes ni las mayúsculas, y tolera algún error al escribir. Si no existe, la última opción dice **Nuevo proveedor**: escribe nombre y cédula (y el apodo si quieres) y sigues con la compra sin perder nada.
2. **Punto de compra.** Solo aparece si tienes más de uno.
3. **Tipo de café.** El sistema deja el mismo tipo que ese proveedor vendió la vez anterior. Puedes cambiarlo:
   - **Mojado:** café recién lavado, todavía húmedo. Se paga a un precio por kilo que acuerdas.
   - **Pergamino seco:** café que el caficultor ya secó. Se puede comprar de dos maneras (abajo).
   - **Pasilla:** café de baja calidad. Se paga a un precio por kilo que acuerdas.
4. **Peso bruto y sacos.** Escribe lo que marca la báscula y cuántos sacos son. El sistema calcula la **tara** (sacos × peso del saco) y el **peso neto**. Si necesitas, toca "editar" y escribe la tara tú.
5. **Precio.** Depende del tipo de café (ver abajo).
6. **Guardar.** Verás el código de la recepción (por ejemplo REC-2026-000024), el neto y el total. **Nueva recepción** te deja listo para el siguiente caficultor.

### Café seco: por calidad o a precio por kilo

No todos los compradores miden la calidad. En el café seco aparece un interruptor **"¿Cómo lo compras?"**:

- **A precio por kilo:** escribes el precio que acordaste. No se pide humedad ni factor. Es lo más rápido.
- **Por calidad:** escribes la **humedad** y los pesos de la **muestra** y de la **almendra**. El sistema calcula el **factor** y busca el precio en la tabla del día. Si no hay un tramo para esa calidad, te avisa: hay que cargarlo en la tabla de precios.

Dentro de la calidad también puedes **digitar el factor** si ya te lo dieron, en vez de calcularlo.

### Si se corta la señal

Vuelve a oprimir **Guardar**. El sistema reconoce que es la misma compra y **no la duplica**. Si cambias algún dato antes de reintentar, se toma como una compra nueva.

### Si te equivocaste

Una recepción guardada no se edita ni se borra, porque mueve plata e inventario. **Todavía no existe el botón para anularla** (está en construcción). Por ahora avísale a quien administra el sistema.

## Retención en la fuente

Es un descuento de impuestos que algunos compradores deben hacer cuando compran café a partir de cierto valor.

- **Es opcional.** Si tu negocio es agente de retención, actívala en **Configuración → Recepción → "Soy agente de retención en la fuente"**. Si no lo eres, déjala apagada y nunca se retiene nada. Confírmalo con tu contador.
- **Cuándo se retiene.** Solo en compras de **pergamino y mojado** (la pasilla no), y solo cuando el **valor total de esa compra** llega a la base mínima. La cuenta es compra por compra: no suma lo que le hayas comprado antes al mismo proveedor.
- **Cuánto.** En 2026 la base es de 70 UVT, que son **$3.666.180** (la UVT vale $52.374), y la tarifa es **0,5 %**.
- **Ejemplo.** Compras por $4.300.000: llega a la base, así que se retiene el 0,5 % = **$21.500**, y el **neto a pagar** es **$4.278.500**. Si compras por $3.000.000, no se retiene nada.
- **Qué queda guardado.** La base, la tarifa, la retención y el neto a pagar quedan escritos en la recepción y **no cambian después**, aunque más adelante cambie la UVT o apagues la opción.
- **Los valores (UVT, base, tarifa) los mantiene la plataforma**, no tú. Se actualizan cada enero. Si te sale el mensaje "no hay un parámetro tributario vigente", avisa a quien administra la plataforma.

## Pagos, anticipos y préstamos

- **Pagos:** registra lo que le pagas a un proveedor, con el método de pago. Puede ir ligado a una recepción.
- **Anticipos:** plata que le adelantas a un proveedor. Después se descuenta contra sus compras (conciliación).
- **Préstamos:** plata que le prestas a un proveedor, con sus abonos.
- **Estado de cuenta:** en Pagos puedes ver, por proveedor, cuánto le has comprado, pagado y adelantado.

Todavía **no** se puede pagar en el mismo paso de la compra: se hace en Pagos. Está en construcción.

## Bodega, ventas, cortes, facturación y reportes

- **Bodega:** cuánto café tienes guardado de cada tipo. Cada recepción suma al inventario. Aquí también registras el secado y la trilla.
- **Ventas:** la venta de café a tus compradores, con contratos si los tienes. El sistema verifica que tengas el café en bodega.
- **Cortes:** los viajes o cortes de café.
- **Facturación:** facturas y resoluciones.
- **Reportes:** resúmenes del día y descargas.

## Qué puedes ajustar tú

Todo está en **Configuración**:

- **Puntos de compra:** tus sedes.
- **Usuarios y Roles:** quién entra al sistema y qué puede hacer cada uno.
- **Recepción:** peso del saco, cómo compras café seco por defecto, rango de humedad aceptable y si eres agente de retención.
- **Qué quiero ver en el menú:** qué módulos mostrar.

## Cuando algo no sale como esperabas

- **"No hay tabla de precios para esa calidad".** Estás comprando por calidad y falta el tramo de hoy. Cárgalo en Recepción → Tabla de precios, o cambia a "A precio por kilo".
- **No me retuvo.** Revisa: ¿está activada la opción de agente de retención? ¿El valor de esa compra llega a $3.666.180? ¿Es pasilla? Si todo está bien y aun así no, avisa.
- **La tara sale en blanco o rara.** Falta escribir los sacos, o no has puesto el peso del saco en Configuración. También puedes tocar "digitar tara".
- **No encuentro a un proveedor.** Prueba con la cédula. Si lo desactivaron, no aparece en la búsqueda.
- **El menú tiene demasiadas cosas.** Configuración → "Qué quiero ver en el menú".
- **No puedo entrar a un módulo.** Puede que tu usuario no tenga permiso, o que tu plan no lo incluya.
- **Se cortó la señal mientras guardaba.** Oprime Guardar otra vez: no se duplica.

## Teclado

- **Enter:** pasa al siguiente campo y, en el último, guarda.
- **Flechas arriba y abajo:** mueven la selección en la búsqueda de proveedor.
- **Esc:** cierra la lista de resultados o una ventana.

## Glosario

- **Peso bruto:** lo que marca la báscula con todo.
- **Tara:** el peso de los sacos. Se resta del bruto.
- **Peso neto:** bruto menos tara: el café de verdad.
- **Mojado:** café recién lavado, aún húmedo.
- **Pergamino seco:** café ya secado, con su cáscara (el pergamino).
- **Pasilla:** café de baja calidad que sale de la trilla.
- **Humedad:** qué tan húmedo está el café seco, en porcentaje.
- **Muestra y almendra:** se pesa una muestra de café pergamino y, ya trillada, cuánto pesa su almendra (el grano limpio).
- **Factor de rendimiento:** cuántos kilos de pergamino hacen falta para sacar una carga de 70 kilos de almendra. **Entre más bajo, mejor el café.** Se calcula así: muestra ÷ almendra × 70.
- **Tramo de precio:** una fila de la tabla de precios: "con este factor y esta humedad, se paga tanto por kilo".
- **UVT:** unidad con la que el Estado fija valores de impuestos. Cambia cada año.
- **Retención en la fuente:** descuento de impuestos que hace el comprador y paga a la DIAN.
- **Agente de retención:** negocio obligado a hacer esa retención.
- **Neto a pagar:** el valor de la compra menos la retención.
- **Anticipo:** plata adelantada a un proveedor.
- **Conciliación:** descontar un anticipo contra una compra.
- **Punto de compra:** una sede o bodega donde recibes café.

## Para quien administra la plataforma

- **Cada diciembre o enero:** cargar la UVT del año nuevo en la tabla de parámetros tributarios. Mientras no se cargue, el sistema usa la del año anterior.
- **Valores tributarios vigentes (2026):** UVT $52.374; compras de café pergamino o cereza, 0,5 % desde 70 UVT. Confirmar con un contador antes de producción: que la pasilla no retenga y que el redondeo sea a centavos por compra.
- **Documentación técnica:** `docs/TECNICO.md`, la bitácora `docs/PROGRESO.md` y las decisiones en `docs/adr/`.
