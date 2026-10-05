import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ModoFactorRendimiento,
  OrigenMovimientoInventario,
  Prisma,
  TipoCafeRecepcion,
  TipoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import { diaColombia } from '../../common/fecha-colombia';
import {
  calcularRetencion,
  TIPOS_CON_RETENCION,
  type ResultadoRetencion,
} from './retencion';
import { siguienteConsecutivo } from '../../prisma/consecutivo';
import {
  ejecutarConLlave,
  type PasosIdempotencia,
} from '../../prisma/idempotencia';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { TablaPreciosService } from './tabla-precios.service';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { QueryRecepcionesDto } from './dto/query-recepciones.dto';

// Factor de rendimiento en convención FNC: kg de café pergamino necesarios
// para producir una carga de 70 kg de almendra. Menor factor = mejor café.
const KG_ALMENDRA_POR_CARGA = 70;

export const RECEPCION_DETAIL_INCLUDE = {
  proveedor: {
    select: {
      id: true,
      nombre: true,
      tipoIdentificacion: true,
      numeroIdentificacion: true,
    },
  },
  puntoCompra: { select: { id: true, nombre: true } },
  tablaPrecioTramo: true,
  analisisCalidad: {
    include: { defectos: { include: { defectoTipo: true } } },
  },
} as const;

const RECEPCION_LIST_INCLUDE = {
  proveedor: { select: { nombre: true } },
  puntoCompra: { select: { nombre: true } },
} as const;

const ALCANCE_IDEMPOTENCIA = 'RECEPCION';

// Los tres tipos de café que se compran en recepción existen 1:1 como tipo
// de inventario (ver TipoInventario en el schema).
const INVENTARIO_POR_TIPO: Record<TipoCafeRecepcion, TipoInventario> = {
  [TipoCafeRecepcion.MOJADO]: TipoInventario.MOJADO,
  [TipoCafeRecepcion.PERGAMINO]: TipoInventario.PERGAMINO,
  [TipoCafeRecepcion.PASILLA]: TipoInventario.PASILLA,
};

// Lo que la recepción lee de ConfiguracionTenant.
type ConfigRecepcion = {
  taraPorSacoKg: Prisma.Decimal | null;
  esAgenteRetencion: boolean;
};

@Injectable()
export class RecepcionService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
    private readonly tablaPrecios: TablaPreciosService,
  ) {}

  findAll(query: QueryRecepcionesDto) {
    const where: Prisma.RecepcionWhereInput = {
      proveedorId: query.proveedorId,
      puntoCompraId: query.puntoCompraId,
      tipoCafe: query.tipoCafe,
      estado: query.estado,
    };
    if (query.desde || query.hasta) {
      where.fecha = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(`${query.hasta}T23:59:59.999Z`) : undefined,
      };
    }
    return this.prisma.recepcion.findMany({
      where,
      include: RECEPCION_LIST_INCLUDE,
      orderBy: { fecha: 'desc' },
    });
  }

  // Datos para abrir la recepción rápida: puntos de compra activos que el usuario
  // puede usar (solo el suyo si está asignado a uno), el peso del saco para
  // calcular la tara y el punto por defecto.
  async contexto(puntoCompraIdUsuario: string | null) {
    const [puntos, config] = await Promise.all([
      this.prisma.puntoCompra.findMany({
        where: {
          activo: true,
          ...(puntoCompraIdUsuario ? { id: puntoCompraIdUsuario } : {}),
        },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.configuracionTenant.findFirst({
        select: {
          taraPorSacoKg: true,
          esAgenteRetencion: true,
          modoCompraPergamino: true,
        },
      }),
    ]);
    return {
      puntosCompra: puntos,
      puntoCompraIdPorDefecto: puntos.length === 1 ? puntos[0].id : null,
      modoCompraPergamino: config?.modoCompraPergamino ?? 'CALIDAD',
      taraPorSacoKg: config?.taraPorSacoKg
        ? Number(config.taraPorSacoKg)
        : null,
      esAgenteRetencion: config?.esAgenteRetencion ?? false,
    };
  }

  async findOne(id: string) {
    const recepcion = await this.prisma.recepcion.findUnique({
      where: { id },
      include: RECEPCION_DETAIL_INCLUDE,
    });
    if (!recepcion) throw new NotFoundException('Recepción no encontrada');
    return recepcion;
  }

  // La tara se digita o se calcula con los sacos (CU-01 paso 4). Queda copiada
  // en la recepción: cambiar luego el peso del saco no la altera (regla 3).
  private async resolverTara(
    dto: CreateRecepcionDto,
    cargarConfig: () => Promise<{
      taraPorSacoKg: Prisma.Decimal | null;
    } | null>,
  ): Promise<number> {
    if (dto.pesoTara !== undefined) return dto.pesoTara;
    if (!dto.numeroSacos) {
      throw new BadRequestException(
        'Indica la tara (pesoTara) o el número de sacos (numeroSacos)',
      );
    }
    const config = await cargarConfig();
    if (!config?.taraPorSacoKg) {
      throw new BadRequestException(
        'Configura el peso del saco (taraPorSacoKg) para calcular la tara con el número de sacos',
      );
    }
    return (
      Math.round(dto.numeroSacos * Number(config.taraPorSacoKg) * 100) / 100
    );
  }

  // CU-03: aplica solo si el negocio es agente de retención y el café es de los
  // que retienen. Los parámetros salen de ParametroTributario por fecha (regla 7);
  // si es agente y no hay ninguno vigente, falla en vez de inventar un valor.
  private async resolverRetencion(
    config: ConfigRecepcion | null,
    tipoCafe: TipoCafeRecepcion,
    valorTotal: string,
    dia: Date,
  ): Promise<ResultadoRetencion> {
    if (!config?.esAgenteRetencion || !TIPOS_CON_RETENCION.has(tipoCafe)) {
      const total = new Prisma.Decimal(valorTotal);
      return {
        aplica: false,
        umbralPesos: new Prisma.Decimal(0),
        baseRetencion: null,
        tarifaRetencion: null,
        valorRetencion: new Prisma.Decimal(0),
        netoPagar: total,
      };
    }
    const parametro = await this.prisma.parametroTributario.findFirst({
      where: { concepto: 'RETENCION_COMPRA_CAFE', vigenteDesde: { lte: dia } },
      orderBy: { vigenteDesde: 'desc' },
    });
    if (!parametro) {
      throw new BadRequestException(
        'El negocio es agente de retención pero no hay un parámetro tributario vigente para esta fecha. Contacta al administrador de la plataforma.',
      );
    }
    return calcularRetencion(valorTotal, parametro);
  }

  // Vista previa para la pantalla de recepción (misma regla que el guardado).
  async previsualizarRetencion(
    tipoCafe: TipoCafeRecepcion,
    valorTotal: number,
  ) {
    const config = await this.prisma.configuracionTenant.findFirst();
    const r = await this.resolverRetencion(
      config,
      tipoCafe,
      valorTotal.toFixed(2),
      diaColombia(),
    );
    return {
      aplica: r.aplica,
      umbralPesos: r.umbralPesos.toString(),
      tarifaRetencion: r.tarifaRetencion?.toString() ?? null,
      valorRetencion: r.valorRetencion.toString(),
      netoPagar: r.netoPagar.toString(),
    };
  }

  private async assertProveedorActivo(proveedorId: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
    });
    if (!proveedor)
      throw new BadRequestException('El proveedor no existe en este tenant');
    if (!proveedor.activo)
      throw new BadRequestException('El proveedor está inactivo');
  }

  private async assertPuntoCompraActivo(puntoCompraId: string) {
    const punto = await this.prisma.puntoCompra.findUnique({
      where: { id: puntoCompraId },
    });
    if (!punto)
      throw new BadRequestException(
        'El punto de compra no existe en este tenant',
      );
    if (!punto.activo)
      throw new BadRequestException('El punto de compra está inactivo');
  }

  private resolverFactorRendimiento(
    analisis: NonNullable<CreateRecepcionDto['analisisCalidad']>,
  ) {
    if (analisis.modoFactor === ModoFactorRendimiento.CALCULADO) {
      if (!analisis.pesoMuestraKg || !analisis.pesoAlmendraMuestraKg) {
        throw new BadRequestException(
          'Para factor de rendimiento calculado se requieren pesoMuestraKg y pesoAlmendraMuestraKg',
        );
      }
      if (analisis.pesoAlmendraMuestraKg > analisis.pesoMuestraKg) {
        throw new BadRequestException(
          'El peso de almendra de la muestra no puede ser mayor al peso de la muestra',
        );
      }
      return (
        Math.round(
          (analisis.pesoMuestraKg / analisis.pesoAlmendraMuestraKg) *
            KG_ALMENDRA_POR_CARGA *
            100,
        ) / 100
      );
    }
    if (!analisis.factorRendimiento) {
      throw new BadRequestException(
        'Se requiere factorRendimiento cuando el modo es MANUAL',
      );
    }
    return analisis.factorRendimiento;
  }

  // Con `llave` (encabezado Idempotency-Key) un reintento no duplica: devuelve
  // la recepción ya creada por la primera petición (ADR-007).
  create(
    tenantId: string,
    createdById: string,
    dto: CreateRecepcionDto,
    llave?: string,
  ) {
    return ejecutarConLlave({
      db: this.prisma,
      tenantId,
      alcance: ALCANCE_IDEMPOTENCIA,
      llave,
      cuerpo: dto,
      obtener: (id) => this.findOne(id),
      ejecutar: (pasos) => this.crear(tenantId, createdById, dto, pasos),
    });
  }

  private async crear(
    tenantId: string,
    createdById: string,
    dto: CreateRecepcionDto,
    pasos: PasosIdempotencia,
  ) {
    await this.assertProveedorActivo(dto.proveedorId);
    await this.assertPuntoCompraActivo(dto.puntoCompraId);

    // La configuración se lee una sola vez por recepción (tara y retención).
    let configuracion: Promise<ConfigRecepcion | null> | undefined;
    const cargarConfig = () =>
      (configuracion ??= this.prisma.configuracionTenant.findFirst());

    const pesoTara = await this.resolverTara(dto, cargarConfig);
    const pesoNeto = Math.round((dto.pesoBruto - pesoTara) * 100) / 100;
    if (pesoNeto <= 0) {
      throw new BadRequestException(
        'El peso neto debe ser mayor a cero (peso bruto - tara)',
      );
    }

    const fecha = new Date();
    let precioKg: number;
    let tablaPrecioTramoId: string | null = null;
    let factorRendimiento: number | null = null;

    // Café seco: por calidad (humedad y factor, precio de la tabla del día) o a
    // precio directo por kilo, como lo compran quienes no miden la calidad.
    const porCalidad =
      dto.tipoCafe === TipoCafeRecepcion.PERGAMINO &&
      dto.analisisCalidad !== undefined;
    if (porCalidad && dto.precioKg !== undefined) {
      throw new BadRequestException(
        'Indica la calidad (humedad y factor) o el precio por kilo, no ambos',
      );
    }

    if (porCalidad) {
      const analisis = dto.analisisCalidad!;
      factorRendimiento = this.resolverFactorRendimiento(analisis);

      const tramo = await this.tablaPrecios.findMatch({
        fecha: diaColombia(fecha),
        puntoCompraId: dto.puntoCompraId,
        humedad: analisis.humedad,
        factorRendimiento,
      });
      if (!tramo) {
        throw new BadRequestException(
          'No hay tabla de precios vigente para esa combinación de humedad y factor de rendimiento. Registre primero el tramo de precio del día.',
        );
      }
      precioKg = Number(tramo.precioKg);
      tablaPrecioTramoId = tramo.id;
    } else {
      // MOJADO, PASILLA y pergamino a precio directo: sin análisis de calidad.
      // El mojado recién lavado no se mide con el rango de humedad de la
      // tabla de precios (ese rango es de café seco); su valor real se sabe
      // después, al secarlo y trillarlo en Bodega.
      if (!dto.precioKg) {
        throw new BadRequestException(
          'Se requiere precioKg para recepciones de mojado, pasilla o pergamino a precio por kilo',
        );
      }
      precioKg = dto.precioKg;
    }

    const valorTotal = Math.round(pesoNeto * precioKg * 100) / 100;
    const retencion = await this.resolverRetencion(
      await cargarConfig(),
      dto.tipoCafe,
      valorTotal.toFixed(2),
      diaColombia(fecha),
    );

    try {
      // Consecutivo atómico en su propia sentencia (no dentro de la transacción):
      // la auditoría usa otra conexión, y un candado retenido toda la
      // transacción agotaría el pool. Puede dejar huecos, nunca duplicados.
      const codigo = await siguienteConsecutivo(
        this.prisma,
        tenantId,
        'RECEPCION',
        fecha,
      );

      return await this.prisma.$transaction(async (tx) => {
        await pasos.reservar(tx);
        const recepcion = await tx.recepcion.create({
          data: {
            tenantId,
            puntoCompraId: dto.puntoCompraId,
            proveedorId: dto.proveedorId,
            codigo,
            tipoCafe: dto.tipoCafe,
            fecha,
            pesoBruto: dto.pesoBruto,
            pesoTara,
            numeroSacos: dto.numeroSacos,
            pesoNeto,
            tablaPrecioTramoId,
            precioKg,
            valorTotal,
            baseRetencion: retencion.baseRetencion,
            tarifaRetencion: retencion.tarifaRetencion,
            valorRetencion: retencion.valorRetencion,
            netoPagar: retencion.netoPagar,
            createdById,
          },
        });

        await tx.movimientoInventario.create({
          data: {
            tenantId,
            puntoCompraId: dto.puntoCompraId,
            tipoCafe: INVENTARIO_POR_TIPO[dto.tipoCafe],
            tipoMovimiento: TipoMovimientoInventario.ENTRADA,
            cantidadKg: pesoNeto,
            fecha,
            origen: OrigenMovimientoInventario.RECEPCION,
            recepcionId: recepcion.id,
            createdById,
          },
        });

        if (porCalidad) {
          const analisis = dto.analisisCalidad!;
          const analisisCalidad = await tx.analisisCalidad.create({
            data: {
              tenantId,
              recepcionId: recepcion.id,
              humedad: analisis.humedad,
              modoFactor: analisis.modoFactor,
              pesoMuestraKg: analisis.pesoMuestraKg,
              pesoAlmendraMuestraKg: analisis.pesoAlmendraMuestraKg,
              factorRendimiento: factorRendimiento!,
              densidad: analisis.densidad,
              tamanoGrano: analisis.tamanoGrano,
              observaciones: analisis.observaciones,
              createdById,
            },
          });

          if (analisis.defectos && analisis.defectos.length > 0) {
            await tx.defectoAnalisis.createMany({
              data: analisis.defectos.map((d) => ({
                analisisCalidadId: analisisCalidad.id,
                defectoTipoId: d.defectoTipoId,
                pesoKg: d.pesoKg,
                porcentaje: d.porcentaje,
              })),
            });
          }
        }

        await pasos.completar(tx, recepcion.id);

        return tx.recepcion.findUniqueOrThrow({
          where: { id: recepcion.id },
          include: RECEPCION_DETAIL_INCLUDE,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Uno o más datos referenciados (proveedor, punto de compra o tipo de defecto) no son válidos',
        );
      }
      throw error;
    }
  }
}
