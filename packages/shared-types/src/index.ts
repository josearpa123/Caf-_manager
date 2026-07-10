// Enums compartidos entre apps/api y apps/web. Deben mantenerse en sincronía
// manualmente con los enums equivalentes en apps/api/prisma/schema.prisma —
// el frontend no puede importar el Prisma Client generado directamente.

export const EstadoTenant = {
  ACTIVO: 'ACTIVO',
  SUSPENDIDO: 'SUSPENDIDO',
  PRUEBA: 'PRUEBA',
  PENDIENTE: 'PENDIENTE',
  RECHAZADO: 'RECHAZADO',
} as const;
export type EstadoTenant = (typeof EstadoTenant)[keyof typeof EstadoTenant];

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
  PERGAMINO: 'PERGAMINO',
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

export const ProveedorTecnologicoFacturacion = {
  NINGUNO: 'NINGUNO',
  FACTUS: 'FACTUS',
  SIIGO: 'SIIGO',
} as const;
export type ProveedorTecnologicoFacturacion =
  (typeof ProveedorTecnologicoFacturacion)[keyof typeof ProveedorTecnologicoFacturacion];

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

export const EstadoProcesoSecado = {
  EN_PROCESO: 'EN_PROCESO',
  FINALIZADO: 'FINALIZADO',
} as const;
export type EstadoProcesoSecado =
  (typeof EstadoProcesoSecado)[keyof typeof EstadoProcesoSecado];

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

export interface InventarioItem {
  puntoCompraId: string;
  puntoCompraNombre: string;
  tipoCafe: TipoInventario;
  cantidadKg: number;
}

export interface ProcesoSecadoRecepcionItem {
  id: string;
  procesoSecadoId: string;
  recepcionId: string;
  pesoMojadoAportadoKg: string;
  recepcion: { id: string; codigo: string; proveedor: { nombre: string } };
}

export interface ProcesoSecado {
  id: string;
  tenantId: string;
  puntoCompraId: string;
  codigo: string;
  fechaInicio: string;
  fechaFin: string | null;
  estado: EstadoProcesoSecado;
  pesoMojadoTotalKg: string;
  pesoSecoResultanteKg: string | null;
  rendimientoPorcentaje: string | null;
  observaciones: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  puntoCompra: Pick<PuntoCompra, 'id' | 'nombre'> | Pick<PuntoCompra, 'nombre'>;
  recepciones: ProcesoSecadoRecepcionItem[];
}

export interface Anticipo {
  id: string;
  tenantId: string;
  proveedorId: string;
  puntoCompraId: string;
  monto: string;
  fecha: string;
  metodoPago: MetodoPago;
  referencia: string | null;
  notas: string | null;
  createdById: string;
  createdAt: string;
  proveedor: Pick<Proveedor, 'nombre'>;
  puntoCompra: Pick<PuntoCompra, 'nombre'>;
}

export interface ConciliacionAnticipo {
  id: string;
  tenantId: string;
  proveedorId: string;
  anticipoId: string;
  recepcionId: string | null;
  pagoId: string | null;
  montoAplicado: string;
  fecha: string;
  notas: string | null;
  createdById: string;
  createdAt: string;
  proveedor: Pick<Proveedor, 'nombre'>;
  anticipo: { id: string; fecha: string; monto: string };
  recepcion: { codigo: string } | null;
  pago: { id: string; fecha: string; monto: string } | null;
}

export interface AnticipoDetalle extends Anticipo {
  conciliaciones: ConciliacionAnticipo[];
  montoConciliado: number;
  saldoDisponible: number;
}

export interface Pago {
  id: string;
  tenantId: string;
  proveedorId: string;
  puntoCompraId: string;
  recepcionId: string | null;
  monto: string;
  fecha: string;
  metodoPago: MetodoPago;
  referencia: string | null;
  numeroCheque: string | null;
  notas: string | null;
  createdById: string;
  createdAt: string;
  proveedor: Pick<Proveedor, 'nombre'>;
  puntoCompra: Pick<PuntoCompra, 'nombre'>;
  recepcion: { codigo: string } | null;
}

export interface EstadoCuentaProveedor {
  proveedorId: string;
  proveedorNombre: string;
  totalComprado: number;
  totalPagadoEfectivo: number;
  totalPagosCredito: number;
  totalAnticipos: number;
  totalConciliado: number;
  anticiposSinConciliar: number;
  saldoPendienteEstimado: number;
}

export interface RolePermissionEntry {
  id: string;
  tenantId: string;
  roleId: string;
  permission: Permission;
}

export interface Role {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion: string | null;
  esSistema: boolean;
  createdAt: string;
  updatedAt: string;
  permisos: RolePermissionEntry[];
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  role: Role;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  nombre: string;
  telefono: string | null;
  puntoCompraId: string | null;
  activo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: UserRoleAssignment[];
}

export interface TenantSelf {
  id: string;
  nombre: string;
  nit: string | null;
  razonSocial: string | null;
  logoUrl: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  estado: EstadoTenant;
  createdAt: string;
  updatedAt: string;
  plan: Plan | null;
  _count: { users: number; puntosCompra: number };
}

export interface Plan {
  id: string;
  nombre: string;
  maxUsuarios: number;
  maxPuntosCompra: number | null;
  createdAt: string;
}

// Forma reducida de Plan que devuelve el endpoint público /registro/planes
// (sin createdAt ni nada interno).
export type PlanPublico = Pick<Plan, 'id' | 'nombre' | 'maxUsuarios' | 'maxPuntosCompra'>;

export interface PlatformTenant {
  id: string;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  estado: EstadoTenant;
  createdAt: string;
  plan: Plan | null;
  _count: { users: number; puntosCompra: number };
  contacto: { nombre: string; email: string; telefono: string | null } | null;
}

export interface Factura {
  id: string;
  tenantId: string;
  puntoCompraId: string;
  recepcionId: string;
  resolucionFacturacionId: string | null;
  numero: number | null;
  cufe: string | null;
  estado: EstadoFactura;
  proveedorTecnologico: ProveedorTecnologicoFacturacion;
  urlPdf: string | null;
  urlXml: string | null;
  fechaEmision: string | null;
  motivoAnulacion: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  puntoCompra: Pick<PuntoCompra, 'nombre'>;
  recepcion: {
    codigo: string;
    valorTotal: string;
    proveedor: Pick<Proveedor, 'nombre' | 'numeroIdentificacion'>;
  };
}

export interface Comprador {
  id: string;
  tenantId: string;
  nombre: string;
  identificacion: string | null;
  telefono: string | null;
  activo: boolean;
  createdAt: string;
}

export interface VentaLoteOrigenItem {
  id: string;
  ventaId: string;
  recepcionId: string;
  cantidadKgAtribuida: string;
  recepcion: { id: string; codigo: string; proveedor: { nombre: string } };
}

export interface Venta {
  id: string;
  tenantId: string;
  puntoCompraId: string;
  codigo: string;
  fecha: string;
  tipoCafe: TipoInventario;
  compradorId: string | null;
  compradorNombre: string;
  cantidadKg: string;
  precioKg: string;
  valorTotal: string;
  contratoVentaId: string | null;
  observaciones: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  puntoCompra: Pick<PuntoCompra, 'nombre'>;
  comprador: Pick<Comprador, 'nombre'> | null;
  lotesOrigen?: VentaLoteOrigenItem[];
}

export const EstadoContratoVenta = {
  VIGENTE: 'VIGENTE',
  CUMPLIDO: 'CUMPLIDO',
  CANCELADO: 'CANCELADO',
} as const;
export type EstadoContratoVenta =
  (typeof EstadoContratoVenta)[keyof typeof EstadoContratoVenta];

export interface ContratoVentaVentaItem {
  id: string;
  codigo: string;
  fecha: string;
  cantidadKg: string;
  valorTotal: string;
}

export interface ContratoVenta {
  id: string;
  tenantId: string;
  puntoCompraId: string;
  codigo: string;
  compradorId: string | null;
  compradorNombre: string;
  tipoCafe: TipoInventario;
  cantidadKgPactada: string;
  cantidadKgEntregada: string;
  precioKg: string;
  fecha: string;
  fechaLimite: string | null;
  estado: EstadoContratoVenta;
  observaciones: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  puntoCompra: Pick<PuntoCompra, 'nombre'>;
  comprador: Pick<Comprador, 'nombre'> | null;
  ventas?: ContratoVentaVentaItem[];
  saldoPendienteKg: number;
  vencido: boolean;
}

export interface ReportesCompraPorTipo {
  tipoCafe: TipoCafeRecepcion;
  kg: number;
  valor: number;
  cantidad: number;
}

export interface ReportesVentaPorTipo {
  tipoCafe: TipoInventario;
  kg: number;
  valor: number;
  cantidad: number;
}

export interface ReportesSaldoProveedor {
  proveedorId: string;
  proveedorNombre: string;
  saldoPendienteEstimado: number;
}

export interface ReportesDashboard {
  compras: { porTipo: ReportesCompraPorTipo[]; totalKg: number; totalValor: number };
  ventas: { porTipo: ReportesVentaPorTipo[]; totalKg: number; totalValor: number };
  margenBrutoPeriodo: number;
  calidadPromedio: {
    humedadPromedio: number | null;
    factorRendimientoPromedio: number | null;
    muestras: number;
  };
  inventario: InventarioItem[];
  saldoProveedores: { totalEstimado: number; proveedores: ReportesSaldoProveedor[] };
}

export interface TrillaProceso {
  id: string;
  tenantId: string;
  puntoCompraId: string;
  codigo: string;
  fecha: string;
  pesoPergaminoKg: string;
  pesoAlmendraKg: string;
  pesoSubproductoKg: string | null;
  rendimientoPorcentaje: string;
  observaciones: string | null;
  createdById: string;
  createdAt: string;
  puntoCompra: Pick<PuntoCompra, 'id' | 'nombre'> | Pick<PuntoCompra, 'nombre'>;
}
