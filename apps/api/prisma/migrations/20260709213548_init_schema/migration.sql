-- CreateEnum
CREATE TYPE "EstadoTenant" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'PRUEBA');

-- CreateEnum
CREATE TYPE "TipoIdentificacion" AS ENUM ('CC', 'NIT', 'CE', 'TI', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('PROVEEDORES_VER', 'PROVEEDORES_CREAR', 'PROVEEDORES_EDITAR', 'PROVEEDORES_ELIMINAR', 'RECEPCION_VER', 'RECEPCION_CREAR', 'RECEPCION_EDITAR', 'RECEPCION_ELIMINAR', 'CALIDAD_VER', 'CALIDAD_EDITAR', 'PRECIOS_VER', 'PRECIOS_EDITAR', 'BODEGA_VER', 'BODEGA_SECADO_GESTIONAR', 'BODEGA_TRILLA_GESTIONAR', 'BODEGA_AJUSTES_GESTIONAR', 'VENTAS_VER', 'VENTAS_CREAR', 'VENTAS_EDITAR', 'VENTAS_ELIMINAR', 'PAGOS_VER', 'PAGOS_CREAR', 'PAGOS_EDITAR', 'PAGOS_ELIMINAR', 'ANTICIPOS_VER', 'ANTICIPOS_CREAR', 'ANTICIPOS_EDITAR', 'FACTURACION_VER', 'FACTURACION_EMITIR', 'FACTURACION_ANULAR', 'REPORTES_VER', 'REPORTES_EXPORTAR', 'USUARIOS_VER', 'USUARIOS_GESTIONAR', 'ROLES_GESTIONAR', 'PUNTOS_COMPRA_GESTIONAR', 'CONFIGURACION_EMPRESA_GESTIONAR', 'AUDITORIA_VER');

-- CreateEnum
CREATE TYPE "TipoCafeRecepcion" AS ENUM ('MOJADO', 'PASILLA');

-- CreateEnum
CREATE TYPE "TipoInventario" AS ENUM ('MOJADO', 'PERGAMINO', 'ALMENDRA', 'PASILLA');

-- CreateEnum
CREATE TYPE "ModoFactorRendimiento" AS ENUM ('CALCULADO', 'MANUAL');

-- CreateEnum
CREATE TYPE "DestinoPasilla" AS ENUM ('MEZCLA', 'VENTA_SEPARADA');

-- CreateEnum
CREATE TYPE "EstadoProcesoSecado" AS ENUM ('EN_PROCESO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "OrigenMovimientoInventario" AS ENUM ('RECEPCION', 'PROCESO_SECADO', 'PROCESO_TRILLA', 'MEZCLA_PASILLA', 'VENTA', 'AJUSTE_MANUAL');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'CHEQUE', 'CREDITO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'EMITIDA', 'ANULADA', 'ERROR');

-- CreateEnum
CREATE TYPE "ProveedorTecnologicoFacturacion" AS ENUM ('NINGUNO', 'FACTUS', 'SIIGO');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'EDITAR', 'ELIMINAR');

-- CreateEnum
CREATE TYPE "CategoriaDefecto" AS ENUM ('PRIMARIO', 'SECUNDARIO');

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "razonSocial" TEXT,
    "logoUrl" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" "EstadoTenant" NOT NULL DEFAULT 'PRUEBA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuntoCompra" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "municipio" TEXT,
    "departamento" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuntoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "puntoCompraId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipoIdentificacion" "TipoIdentificacion" NOT NULL,
    "numeroIdentificacion" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "vereda" TEXT,
    "municipio" TEXT,
    "departamento" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comprador" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "identificacion" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comprador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionTenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "humedadMinAceptable" DECIMAL(5,2) NOT NULL,
    "humedadMaxAceptable" DECIMAL(5,2) NOT NULL,
    "rendimientoMinAceptable" DECIMAL(6,2),
    "rendimientoMaxAceptable" DECIMAL(6,2),
    "saldoProveedorUmbral" DECIMAL(14,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TablaPrecioTramo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT,
    "fecha" DATE NOT NULL,
    "nombre" TEXT,
    "factorMin" DECIMAL(6,2) NOT NULL,
    "factorMax" DECIMAL(6,2) NOT NULL,
    "humedadMin" DECIMAL(5,2) NOT NULL,
    "humedadMax" DECIMAL(5,2) NOT NULL,
    "precioKg" DECIMAL(12,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TablaPrecioTramo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolucionFacturacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT,
    "prefijo" TEXT,
    "numeroDesde" INTEGER NOT NULL,
    "numeroHasta" INTEGER NOT NULL,
    "numeroActual" INTEGER NOT NULL DEFAULT 0,
    "fechaVigenciaDesde" DATE NOT NULL,
    "fechaVigenciaHasta" DATE NOT NULL,
    "claveTecnica" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResolucionFacturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectoTipo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaDefecto" NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DefectoTipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recepcion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipoCafe" "TipoCafeRecepcion" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pesoBruto" DECIMAL(10,2) NOT NULL,
    "pesoTara" DECIMAL(10,2) NOT NULL,
    "pesoNeto" DECIMAL(10,2) NOT NULL,
    "tablaPrecioTramoId" TEXT,
    "precioKg" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "destinoPasilla" "DestinoPasilla",
    "fechaDecisionDestino" TIMESTAMP(3),
    "decididoPorId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalisisCalidad" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recepcionId" TEXT NOT NULL,
    "humedad" DECIMAL(5,2) NOT NULL,
    "modoFactor" "ModoFactorRendimiento" NOT NULL,
    "pesoMuestraKg" DECIMAL(8,4),
    "pesoAlmendraMuestraKg" DECIMAL(8,4),
    "factorRendimiento" DECIMAL(6,2) NOT NULL,
    "densidad" DECIMAL(6,2),
    "tamanoGrano" TEXT,
    "observaciones" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalisisCalidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectoAnalisis" (
    "id" TEXT NOT NULL,
    "analisisCalidadId" TEXT NOT NULL,
    "defectoTipoId" TEXT NOT NULL,
    "pesoKg" DECIMAL(8,4),
    "porcentaje" DECIMAL(5,2),

    CONSTRAINT "DefectoAnalisis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoSecado" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoProcesoSecado" NOT NULL DEFAULT 'EN_PROCESO',
    "pesoMojadoTotalKg" DECIMAL(10,2),
    "pesoSecoResultanteKg" DECIMAL(10,2),
    "rendimientoPorcentaje" DECIMAL(5,2),
    "observaciones" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcesoSecado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcesoSecadoRecepcion" (
    "id" TEXT NOT NULL,
    "procesoSecadoId" TEXT NOT NULL,
    "recepcionId" TEXT NOT NULL,
    "pesoMojadoAportadoKg" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ProcesoSecadoRecepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrillaProceso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pesoPergaminoKg" DECIMAL(10,2) NOT NULL,
    "pesoAlmendraKg" DECIMAL(10,2) NOT NULL,
    "pesoSubproductoKg" DECIMAL(10,2),
    "rendimientoPorcentaje" DECIMAL(5,2) NOT NULL,
    "observaciones" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrillaProceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "tipoCafe" "TipoInventario" NOT NULL,
    "tipoMovimiento" "TipoMovimientoInventario" NOT NULL,
    "cantidadKg" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origen" "OrigenMovimientoInventario" NOT NULL,
    "recepcionId" TEXT,
    "procesoSecadoId" TEXT,
    "trillaProcesoId" TEXT,
    "ventaId" TEXT,
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anticipo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anticipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "recepcionId" TEXT,
    "monto" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" "MetodoPago" NOT NULL,
    "referencia" TEXT,
    "numeroCheque" TEXT,
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConciliacionAnticipo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "anticipoId" TEXT NOT NULL,
    "recepcionId" TEXT,
    "pagoId" TEXT,
    "montoAplicado" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConciliacionAnticipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipoCafe" "TipoInventario" NOT NULL,
    "compradorId" TEXT,
    "compradorNombre" TEXT NOT NULL,
    "cantidadKg" DECIMAL(10,2) NOT NULL,
    "precioKg" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "observaciones" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentaLoteOrigen" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "recepcionId" TEXT NOT NULL,
    "cantidadKgAtribuida" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "VentaLoteOrigen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "puntoCompraId" TEXT NOT NULL,
    "recepcionId" TEXT NOT NULL,
    "resolucionFacturacionId" TEXT,
    "numero" INTEGER,
    "cufe" TEXT,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "proveedorTecnologico" "ProveedorTecnologicoFacturacion" NOT NULL DEFAULT 'NINGUNO',
    "payloadRequest" JSONB,
    "payloadResponse" JSONB,
    "urlPdf" TEXT,
    "urlXml" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,
    "ipAddress" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puntoCompraId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "entidadRelacionada" TEXT,
    "entidadId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE INDEX "Tenant_estado_idx" ON "Tenant"("estado");

-- CreateIndex
CREATE INDEX "PuntoCompra_tenantId_idx" ON "PuntoCompra"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PuntoCompra_tenantId_nombre_key" ON "PuntoCompra"("tenantId", "nombre");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_nombre_key" ON "Role"("tenantId", "nombre");

-- CreateIndex
CREATE INDEX "RolePermission_tenantId_idx" ON "RolePermission"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permission_key" ON "RolePermission"("roleId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_puntoCompraId_idx" ON "User"("tenantId", "puntoCompraId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Proveedor_tenantId_idx" ON "Proveedor"("tenantId");

-- CreateIndex
CREATE INDEX "Proveedor_tenantId_municipio_idx" ON "Proveedor"("tenantId", "municipio");

-- CreateIndex
CREATE INDEX "Proveedor_tenantId_activo_idx" ON "Proveedor"("tenantId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_tenantId_tipoIdentificacion_numeroIdentificacion_key" ON "Proveedor"("tenantId", "tipoIdentificacion", "numeroIdentificacion");

-- CreateIndex
CREATE INDEX "Comprador_tenantId_idx" ON "Comprador"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionTenant_tenantId_key" ON "ConfiguracionTenant"("tenantId");

-- CreateIndex
CREATE INDEX "TablaPrecioTramo_tenantId_fecha_idx" ON "TablaPrecioTramo"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "TablaPrecioTramo_tenantId_puntoCompraId_fecha_idx" ON "TablaPrecioTramo"("tenantId", "puntoCompraId", "fecha");

-- CreateIndex
CREATE INDEX "ResolucionFacturacion_tenantId_idx" ON "ResolucionFacturacion"("tenantId");

-- CreateIndex
CREATE INDEX "ResolucionFacturacion_tenantId_activo_idx" ON "ResolucionFacturacion"("tenantId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "DefectoTipo_codigo_key" ON "DefectoTipo"("codigo");

-- CreateIndex
CREATE INDEX "Recepcion_tenantId_fecha_idx" ON "Recepcion"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Recepcion_tenantId_proveedorId_idx" ON "Recepcion"("tenantId", "proveedorId");

-- CreateIndex
CREATE INDEX "Recepcion_tenantId_puntoCompraId_idx" ON "Recepcion"("tenantId", "puntoCompraId");

-- CreateIndex
CREATE INDEX "Recepcion_tenantId_tipoCafe_idx" ON "Recepcion"("tenantId", "tipoCafe");

-- CreateIndex
CREATE UNIQUE INDEX "Recepcion_tenantId_codigo_key" ON "Recepcion"("tenantId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AnalisisCalidad_recepcionId_key" ON "AnalisisCalidad"("recepcionId");

-- CreateIndex
CREATE INDEX "AnalisisCalidad_tenantId_idx" ON "AnalisisCalidad"("tenantId");

-- CreateIndex
CREATE INDEX "DefectoAnalisis_analisisCalidadId_idx" ON "DefectoAnalisis"("analisisCalidadId");

-- CreateIndex
CREATE UNIQUE INDEX "DefectoAnalisis_analisisCalidadId_defectoTipoId_key" ON "DefectoAnalisis"("analisisCalidadId", "defectoTipoId");

-- CreateIndex
CREATE INDEX "ProcesoSecado_tenantId_puntoCompraId_idx" ON "ProcesoSecado"("tenantId", "puntoCompraId");

-- CreateIndex
CREATE INDEX "ProcesoSecado_tenantId_estado_idx" ON "ProcesoSecado"("tenantId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ProcesoSecado_tenantId_codigo_key" ON "ProcesoSecado"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "ProcesoSecadoRecepcion_recepcionId_idx" ON "ProcesoSecadoRecepcion"("recepcionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcesoSecadoRecepcion_procesoSecadoId_recepcionId_key" ON "ProcesoSecadoRecepcion"("procesoSecadoId", "recepcionId");

-- CreateIndex
CREATE INDEX "TrillaProceso_tenantId_puntoCompraId_idx" ON "TrillaProceso"("tenantId", "puntoCompraId");

-- CreateIndex
CREATE UNIQUE INDEX "TrillaProceso_tenantId_codigo_key" ON "TrillaProceso"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "MovimientoInventario_tenantId_puntoCompraId_tipoCafe_idx" ON "MovimientoInventario"("tenantId", "puntoCompraId", "tipoCafe");

-- CreateIndex
CREATE INDEX "MovimientoInventario_tenantId_fecha_idx" ON "MovimientoInventario"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoInventario_recepcionId_idx" ON "MovimientoInventario"("recepcionId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_procesoSecadoId_idx" ON "MovimientoInventario"("procesoSecadoId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_trillaProcesoId_idx" ON "MovimientoInventario"("trillaProcesoId");

-- CreateIndex
CREATE INDEX "MovimientoInventario_ventaId_idx" ON "MovimientoInventario"("ventaId");

-- CreateIndex
CREATE INDEX "Anticipo_tenantId_proveedorId_idx" ON "Anticipo"("tenantId", "proveedorId");

-- CreateIndex
CREATE INDEX "Anticipo_tenantId_fecha_idx" ON "Anticipo"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Pago_tenantId_proveedorId_idx" ON "Pago"("tenantId", "proveedorId");

-- CreateIndex
CREATE INDEX "Pago_tenantId_fecha_idx" ON "Pago"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Pago_recepcionId_idx" ON "Pago"("recepcionId");

-- CreateIndex
CREATE INDEX "ConciliacionAnticipo_tenantId_proveedorId_idx" ON "ConciliacionAnticipo"("tenantId", "proveedorId");

-- CreateIndex
CREATE INDEX "ConciliacionAnticipo_anticipoId_idx" ON "ConciliacionAnticipo"("anticipoId");

-- CreateIndex
CREATE INDEX "ConciliacionAnticipo_recepcionId_idx" ON "ConciliacionAnticipo"("recepcionId");

-- CreateIndex
CREATE INDEX "ConciliacionAnticipo_pagoId_idx" ON "ConciliacionAnticipo"("pagoId");

-- CreateIndex
CREATE INDEX "Venta_tenantId_fecha_idx" ON "Venta"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "Venta_tenantId_puntoCompraId_idx" ON "Venta"("tenantId", "puntoCompraId");

-- CreateIndex
CREATE INDEX "Venta_compradorId_idx" ON "Venta"("compradorId");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_tenantId_codigo_key" ON "Venta"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "VentaLoteOrigen_recepcionId_idx" ON "VentaLoteOrigen"("recepcionId");

-- CreateIndex
CREATE UNIQUE INDEX "VentaLoteOrigen_ventaId_recepcionId_key" ON "VentaLoteOrigen"("ventaId", "recepcionId");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_recepcionId_key" ON "Factura"("recepcionId");

-- CreateIndex
CREATE INDEX "Factura_tenantId_estado_idx" ON "Factura"("tenantId", "estado");

-- CreateIndex
CREATE INDEX "Factura_tenantId_puntoCompraId_idx" ON "Factura"("tenantId", "puntoCompraId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entidad_entidadId_idx" ON "AuditLog"("tenantId", "entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_fecha_idx" ON "AuditLog"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "Notificacion_tenantId_userId_leida_idx" ON "Notificacion"("tenantId", "userId", "leida");

-- AddForeignKey
ALTER TABLE "PuntoCompra" ADD CONSTRAINT "PuntoCompra_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprador" ADD CONSTRAINT "Comprador_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionTenant" ADD CONSTRAINT "ConfiguracionTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablaPrecioTramo" ADD CONSTRAINT "TablaPrecioTramo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablaPrecioTramo" ADD CONSTRAINT "TablaPrecioTramo_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TablaPrecioTramo" ADD CONSTRAINT "TablaPrecioTramo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolucionFacturacion" ADD CONSTRAINT "ResolucionFacturacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recepcion" ADD CONSTRAINT "Recepcion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recepcion" ADD CONSTRAINT "Recepcion_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recepcion" ADD CONSTRAINT "Recepcion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recepcion" ADD CONSTRAINT "Recepcion_tablaPrecioTramoId_fkey" FOREIGN KEY ("tablaPrecioTramoId") REFERENCES "TablaPrecioTramo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recepcion" ADD CONSTRAINT "Recepcion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisCalidad" ADD CONSTRAINT "AnalisisCalidad_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisCalidad" ADD CONSTRAINT "AnalisisCalidad_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "Recepcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalisisCalidad" ADD CONSTRAINT "AnalisisCalidad_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectoAnalisis" ADD CONSTRAINT "DefectoAnalisis_analisisCalidadId_fkey" FOREIGN KEY ("analisisCalidadId") REFERENCES "AnalisisCalidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectoAnalisis" ADD CONSTRAINT "DefectoAnalisis_defectoTipoId_fkey" FOREIGN KEY ("defectoTipoId") REFERENCES "DefectoTipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoSecado" ADD CONSTRAINT "ProcesoSecado_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoSecado" ADD CONSTRAINT "ProcesoSecado_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoSecado" ADD CONSTRAINT "ProcesoSecado_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoSecadoRecepcion" ADD CONSTRAINT "ProcesoSecadoRecepcion_procesoSecadoId_fkey" FOREIGN KEY ("procesoSecadoId") REFERENCES "ProcesoSecado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcesoSecadoRecepcion" ADD CONSTRAINT "ProcesoSecadoRecepcion_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "Recepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrillaProceso" ADD CONSTRAINT "TrillaProceso_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrillaProceso" ADD CONSTRAINT "TrillaProceso_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrillaProceso" ADD CONSTRAINT "TrillaProceso_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "Recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_procesoSecadoId_fkey" FOREIGN KEY ("procesoSecadoId") REFERENCES "ProcesoSecado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_trillaProcesoId_fkey" FOREIGN KEY ("trillaProcesoId") REFERENCES "TrillaProceso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anticipo" ADD CONSTRAINT "Anticipo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anticipo" ADD CONSTRAINT "Anticipo_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anticipo" ADD CONSTRAINT "Anticipo_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anticipo" ADD CONSTRAINT "Anticipo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "Recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionAnticipo" ADD CONSTRAINT "ConciliacionAnticipo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionAnticipo" ADD CONSTRAINT "ConciliacionAnticipo_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionAnticipo" ADD CONSTRAINT "ConciliacionAnticipo_anticipoId_fkey" FOREIGN KEY ("anticipoId") REFERENCES "Anticipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionAnticipo" ADD CONSTRAINT "ConciliacionAnticipo_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "Recepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionAnticipo" ADD CONSTRAINT "ConciliacionAnticipo_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConciliacionAnticipo" ADD CONSTRAINT "ConciliacionAnticipo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaLoteOrigen" ADD CONSTRAINT "VentaLoteOrigen_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentaLoteOrigen" ADD CONSTRAINT "VentaLoteOrigen_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "Recepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_recepcionId_fkey" FOREIGN KEY ("recepcionId") REFERENCES "Recepcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_resolucionFacturacionId_fkey" FOREIGN KEY ("resolucionFacturacionId") REFERENCES "ResolucionFacturacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_puntoCompraId_fkey" FOREIGN KEY ("puntoCompraId") REFERENCES "PuntoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

