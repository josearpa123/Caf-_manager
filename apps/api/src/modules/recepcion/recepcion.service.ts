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
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { TablaPreciosService } from './tabla-precios.service';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { QueryRecepcionesDto } from './dto/query-recepciones.dto';

// Factor de rendimiento en convención FNC: kg de café pergamino necesarios
// para producir una carga de 70 kg de almendra. Menor factor = mejor café.
const KG_ALMENDRA_POR_CARGA = 70;

const RECEPCION_DETAIL_INCLUDE = {
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

// Los tres tipos de café que se compran en recepción existen 1:1 como tipo
// de inventario (ver TipoInventario en el schema).
const INVENTARIO_POR_TIPO: Record<TipoCafeRecepcion, TipoInventario> = {
  [TipoCafeRecepcion.MOJADO]: TipoInventario.MOJADO,
  [TipoCafeRecepcion.PERGAMINO]: TipoInventario.PERGAMINO,
  [TipoCafeRecepcion.PASILLA]: TipoInventario.PASILLA,
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

  async findOne(id: string) {
    const recepcion = await this.prisma.recepcion.findUnique({
      where: { id },
      include: RECEPCION_DETAIL_INCLUDE,
    });
    if (!recepcion) throw new NotFoundException('Recepción no encontrada');
    return recepcion;
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

  async create(tenantId: string, createdById: string, dto: CreateRecepcionDto) {
    await this.assertProveedorActivo(dto.proveedorId);
    await this.assertPuntoCompraActivo(dto.puntoCompraId);

    const pesoNeto = Math.round((dto.pesoBruto - dto.pesoTara) * 100) / 100;
    if (pesoNeto <= 0) {
      throw new BadRequestException(
        'El peso neto debe ser mayor a cero (peso bruto - tara)',
      );
    }

    const fecha = new Date();
    let precioKg: number;
    let tablaPrecioTramoId: string | null = null;
    let factorRendimiento: number | null = null;

    if (dto.tipoCafe === TipoCafeRecepcion.PERGAMINO) {
      const analisis = dto.analisisCalidad!;
      factorRendimiento = this.resolverFactorRendimiento(analisis);

      const tramo = await this.tablaPrecios.findMatch({
        fecha,
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
      // MOJADO y PASILLA: precio directo negociado, sin análisis de calidad.
      // El mojado recién lavado no se mide con el rango de humedad de la
      // tabla de precios (ese rango es de café seco); su valor real se sabe
      // después, al secarlo y trillarlo en Bodega.
      if (!dto.precioKg) {
        throw new BadRequestException(
          'Se requiere precioKg para recepciones de mojado o pasilla',
        );
      }
      precioKg = dto.precioKg;
    }

    const valorTotal = Math.round(pesoNeto * precioKg * 100) / 100;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const year = fecha.getUTCFullYear();
        const prefix = `REC-${year}-`;
        const count = await tx.recepcion.count({
          where: { codigo: { startsWith: prefix } },
        });
        const codigo = `${prefix}${String(count + 1).padStart(6, '0')}`;

        const recepcion = await tx.recepcion.create({
          data: {
            tenantId,
            puntoCompraId: dto.puntoCompraId,
            proveedorId: dto.proveedorId,
            codigo,
            tipoCafe: dto.tipoCafe,
            fecha,
            pesoBruto: dto.pesoBruto,
            pesoTara: dto.pesoTara,
            pesoNeto,
            tablaPrecioTramoId,
            precioKg,
            valorTotal,
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

        if (dto.tipoCafe === TipoCafeRecepcion.PERGAMINO) {
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
