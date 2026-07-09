// Enums compartidos entre apps/api y apps/web. Deben mantenerse en sincronía
// manualmente con los enums equivalentes en apps/api/prisma/schema.prisma —
// el frontend no puede importar el Prisma Client generado directamente.

export const TipoCafeRecepcion = {
  MOJADO: 'MOJADO',
  PASILLA: 'PASILLA',
} as const;
export type TipoCafeRecepcion =
  (typeof TipoCafeRecepcion)[keyof typeof TipoCafeRecepcion];

export const TipoInventario = {
  MOJADO: 'MOJADO',
  PERGAMINO: 'PERGAMINO',
  ALMENDRA: 'ALMENDRA',
  PASILLA: 'PASILLA',
} as const;
export type TipoInventario =
  (typeof TipoInventario)[keyof typeof TipoInventario];

export const ModoFactorRendimiento = {
  CALCULADO: 'CALCULADO',
  MANUAL: 'MANUAL',
} as const;
export type ModoFactorRendimiento =
  (typeof ModoFactorRendimiento)[keyof typeof ModoFactorRendimiento];

export const DestinoPasilla = {
  MEZCLA: 'MEZCLA',
  VENTA_SEPARADA: 'VENTA_SEPARADA',
} as const;
export type DestinoPasilla =
  (typeof DestinoPasilla)[keyof typeof DestinoPasilla];

export const MetodoPago = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  CHEQUE: 'CHEQUE',
  CREDITO: 'CREDITO',
} as const;
export type MetodoPago = (typeof MetodoPago)[keyof typeof MetodoPago];

export const EstadoFactura = {
  PENDIENTE: 'PENDIENTE',
  EMITIDA: 'EMITIDA',
  ANULADA: 'ANULADA',
  ERROR: 'ERROR',
} as const;
export type EstadoFactura = (typeof EstadoFactura)[keyof typeof EstadoFactura];

export const Permission = {
  PROVEEDORES_VER: 'PROVEEDORES_VER',
  PROVEEDORES_CREAR: 'PROVEEDORES_CREAR',
  PROVEEDORES_EDITAR: 'PROVEEDORES_EDITAR',
  PROVEEDORES_ELIMINAR: 'PROVEEDORES_ELIMINAR',

  RECEPCION_VER: 'RECEPCION_VER',
  RECEPCION_CREAR: 'RECEPCION_CREAR',
  RECEPCION_EDITAR: 'RECEPCION_EDITAR',
  RECEPCION_ELIMINAR: 'RECEPCION_ELIMINAR',

  CALIDAD_VER: 'CALIDAD_VER',
  CALIDAD_EDITAR: 'CALIDAD_EDITAR',

  PRECIOS_VER: 'PRECIOS_VER',
  PRECIOS_EDITAR: 'PRECIOS_EDITAR',

  BODEGA_VER: 'BODEGA_VER',
  BODEGA_SECADO_GESTIONAR: 'BODEGA_SECADO_GESTIONAR',
  BODEGA_TRILLA_GESTIONAR: 'BODEGA_TRILLA_GESTIONAR',
  BODEGA_AJUSTES_GESTIONAR: 'BODEGA_AJUSTES_GESTIONAR',

  VENTAS_VER: 'VENTAS_VER',
  VENTAS_CREAR: 'VENTAS_CREAR',
  VENTAS_EDITAR: 'VENTAS_EDITAR',
  VENTAS_ELIMINAR: 'VENTAS_ELIMINAR',

  PAGOS_VER: 'PAGOS_VER',
  PAGOS_CREAR: 'PAGOS_CREAR',
  PAGOS_EDITAR: 'PAGOS_EDITAR',
  PAGOS_ELIMINAR: 'PAGOS_ELIMINAR',

  ANTICIPOS_VER: 'ANTICIPOS_VER',
  ANTICIPOS_CREAR: 'ANTICIPOS_CREAR',
  ANTICIPOS_EDITAR: 'ANTICIPOS_EDITAR',

  FACTURACION_VER: 'FACTURACION_VER',
  FACTURACION_EMITIR: 'FACTURACION_EMITIR',
  FACTURACION_ANULAR: 'FACTURACION_ANULAR',

  REPORTES_VER: 'REPORTES_VER',
  REPORTES_EXPORTAR: 'REPORTES_EXPORTAR',

  USUARIOS_VER: 'USUARIOS_VER',
  USUARIOS_GESTIONAR: 'USUARIOS_GESTIONAR',
  ROLES_GESTIONAR: 'ROLES_GESTIONAR',

  PUNTOS_COMPRA_GESTIONAR: 'PUNTOS_COMPRA_GESTIONAR',
  CONFIGURACION_EMPRESA_GESTIONAR: 'CONFIGURACION_EMPRESA_GESTIONAR',

  AUDITORIA_VER: 'AUDITORIA_VER',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];
