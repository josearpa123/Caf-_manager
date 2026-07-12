// Whitelist explícita (no blacklist) de modelos con columna tenantId propia,
// para los que es seguro auto-inyectar el filtro de tenant. Un modelo nuevo
// agregado al schema queda SIN auto-scoping hasta agregarlo aquí a propósito
// — falla cerrado, no abierto.
//
// Excluidos intencionalmente (no tienen columna tenantId, se acceden siempre
// a través de su padre ya tenant-scoped, o son catálogos/entidades globales):
// PlatformAdmin, DefectoTipo, UserRole, RefreshToken, ProcesoSecadoRecepcion,
// DefectoAnalisis, VentaLoteOrigen.
//
// Tenant se maneja aparte (se filtra por `id`, no por `tenantId`).
export const TENANT_SCOPED_MODELS = new Set([
  'PuntoCompra',
  'Role',
  'RolePermission',
  'User',
  'Proveedor',
  'Comprador',
  'ConfiguracionTenant',
  'TablaPrecioTramo',
  'ResolucionFacturacion',
  'Recepcion',
  'AnalisisCalidad',
  'ProcesoSecado',
  'TrillaProceso',
  'MovimientoInventario',
  'Anticipo',
  'Pago',
  'ConciliacionAnticipo',
  'Prestamo',
  'AbonoPrestamo',
  'Venta',
  'Viaje',
  'ContratoVenta',
  'Factura',
  'AuditLog',
  'Notificacion',
]);

export const READ_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

export const WHERE_WRITE_OPS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);
