// Enums compartidos entre apps/api y apps/web. Deben mantenerse en sincronía
// manualmente con los enums equivalentes en apps/api/prisma/schema.prisma —
// el frontend no puede importar el Prisma Client generado directamente.

export const TipoIdentificacion = {
  CC: 'CC',
  NIT: 'NIT',
  CE: 'CE',
  TI: 'TI',
  PASAPORTE: 'PASAPORTE',
} as const;
export type TipoIdentificacion =
  (typeof TipoIdentificacion)[keyof typeof TipoIdentificacion];

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

export const CategoriaDefecto = {
  PRIMARIO: 'PRIMARIO',
  SECUNDARIO: 'SECUNDARIO',
} as const;
export type CategoriaDefecto =
  (typeof CategoriaDefecto)[keyof typeof CategoriaDefecto];

export interface Proveedor {
  id: string;
  tenantId: string;
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  vereda: string | null;
  municipio: string | null;
  departamento: string | null;
  activo: boolean;
  notas: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PuntoCompra {
  id: string;
  tenantId: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  municipio: string | null;
  departamento: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DefectoTipo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: CategoriaDefecto;
  orden: number;
  activo: boolean;
}

export interface TablaPrecioTramo {
  id: string;
  tenantId: string;
  puntoCompraId: string | null;
  fecha: string;
  nombre: string | null;
  factorMin: string;
  factorMax: string;
  humedadMin: string;
  humedadMax: string;
  precioKg: string;
  createdById: string;
  createdAt: string;
}

export interface DefectoAnalisis {
  id: string;
  analisisCalidadId: string;
  defectoTipoId: string;
  pesoKg: string | null;
  porcentaje: string | null;
  defectoTipo: DefectoTipo;
}

export interface AnalisisCalidad {
  id: string;
  tenantId: string;
  recepcionId: string;
  humedad: string;
  modoFactor: ModoFactorRendimiento;
  pesoMuestraKg: string | null;
  pesoAlmendraMuestraKg: string | null;
  factorRendimiento: string;
  densidad: string | null;
  tamanoGrano: string | null;
  observaciones: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  defectos: DefectoAnalisis[];
}

export interface Recepcion {
  id: string;
  tenantId: string;
  puntoCompraId: string;
  proveedorId: string;
  codigo: string;
  tipoCafe: TipoCafeRecepcion;
  fecha: string;
  pesoBruto: string;
  pesoTara: string;
  pesoNeto: string;
  tablaPrecioTramoId: string | null;
  precioKg: string;
  valorTotal: string;
  destinoPasilla: DestinoPasilla | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  proveedor: Pick<Proveedor, 'id' | 'nombre' | 'tipoIdentificacion' | 'numeroIdentificacion'> | Pick<Proveedor, 'nombre'>;
  puntoCompra: Pick<PuntoCompra, 'id' | 'nombre'> | Pick<PuntoCompra, 'nombre'>;
  tablaPrecioTramo: TablaPrecioTramo | null;
  analisisCalidad: AnalisisCalidad | null;
}
