import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoProcesoSecado,
  OrigenMovimientoInventario,
  TipoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateProcesoSecadoDto } from './dto/create-proceso-secado.dto';
import { FinalizarProcesoSecadoDto } from './dto/finalizar-proceso-secado.dto';
import { QueryPuntoCompraDto } from './dto/query-punto-compra.dto';

const SECADO_DETAIL_INCLUDE = {
  puntoCompra: { select: { id: true, nombre: true } },
  recepciones: {
    include: {
      recepcion: {
        select: {
          id: true,
          codigo: true,
          proveedor: { select: { nombre: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class SecadoService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll(query: QueryPuntoCompraDto) {
    return this.prisma.procesoSecado.findMany({
      where: query.puntoCompraId
        ? { puntoCompraId: query.puntoCompraId }
        : undefined,
      include: { puntoCompra: { select: { nombre: true } }, recepciones: true },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async findOne(id: string) {
    const proceso = await this.prisma.procesoSecado.findUnique({
      where: { id },
      include: SECADO_DETAIL_INCLUDE,
    });
    if (!proceso)
      throw new NotFoundException('Proceso de secado no encontrado');
    return proceso;
  }

  async create(
    tenantId: string,
    createdById: string,
    dto: CreateProcesoSecadoDto,
  ) {
    const punto = await this.prisma.puntoCompra.findUnique({
      where: { id: dto.puntoCompraId },
    });
    if (!punto)
      throw new BadRequestException(
        'El punto de compra no existe en este tenant',
      );
    if (!punto.activo)
      throw new BadRequestException('El punto de compra está inactivo');

    const recepcionIds = [...new Set(dto.recepcionIds)];
    const recepciones = await this.prisma.recepcion.findMany({
      where: { id: { in: recepcionIds } },
    });
    if (recepciones.length !== recepcionIds.length) {
      throw new BadRequestException(
        'Una o más recepciones no existen en este tenant',
      );
    }
    if (recepciones.some((r) => r.tipoCafe !== 'MOJADO')) {
      throw new BadRequestException(
        'Solo se pueden secar recepciones de tipo mojado',
      );
    }
    if (recepciones.some((r) => r.puntoCompraId !== dto.puntoCompraId)) {
      throw new BadRequestException(
        'Todas las recepciones deben pertenecer al mismo punto de compra del proceso',
      );
    }

    const yaUsadas = await this.prisma.procesoSecadoRecepcion.findMany({
      where: { recepcionId: { in: recepcionIds } },
    });
    if (yaUsadas.length > 0) {
      throw new BadRequestException(
        'Una o más recepciones ya fueron asignadas a otro proceso de secado',
      );
    }

    const pesoMojadoTotalKg = recepciones.reduce(
      (acc, r) => acc + Number(r.pesoNeto),
      0,
    );
    const fechaInicio = new Date();

    return this.prisma.$transaction(async (tx) => {
      const year = fechaInicio.getUTCFullYear();
      const prefix = `SEC-${year}-`;
      const count = await tx.procesoSecado.count({
        where: { codigo: { startsWith: prefix } },
      });
      const codigo = `${prefix}${String(count + 1).padStart(6, '0')}`;

      const proceso = await tx.procesoSecado.create({
        data: {
          tenantId,
          puntoCompraId: dto.puntoCompraId,
          codigo,
          fechaInicio,
          estado: EstadoProcesoSecado.EN_PROCESO,
          pesoMojadoTotalKg,
          observaciones: dto.observaciones,
          createdById,
        },
      });

      await tx.procesoSecadoRecepcion.createMany({
        data: recepciones.map((r) => ({
          procesoSecadoId: proceso.id,
          recepcionId: r.id,
          pesoMojadoAportadoKg: r.pesoNeto,
        })),
      });

      for (const r of recepciones) {
        await tx.movimientoInventario.create({
          data: {
            tenantId,
            puntoCompraId: dto.puntoCompraId,
            tipoCafe: TipoInventario.MOJADO,
            tipoMovimiento: TipoMovimientoInventario.SALIDA,
            cantidadKg: r.pesoNeto,
            origen: OrigenMovimientoInventario.PROCESO_SECADO,
            procesoSecadoId: proceso.id,
            recepcionId: r.id,
            createdById,
          },
        });
      }

      return tx.procesoSecado.findUniqueOrThrow({
        where: { id: proceso.id },
        include: SECADO_DETAIL_INCLUDE,
      });
    });
  }

  async finalizar(
    tenantId: string,
    createdById: string,
    id: string,
    dto: FinalizarProcesoSecadoDto,
  ) {
    const proceso = await this.prisma.procesoSecado.findUnique({
      where: { id },
    });
    if (!proceso)
      throw new NotFoundException('Proceso de secado no encontrado');
    if (proceso.estado !== EstadoProcesoSecado.EN_PROCESO) {
      throw new BadRequestException('Este proceso de secado ya fue finalizado');
    }

    const rendimientoPorcentaje =
      Math.round(
        (dto.pesoSecoResultanteKg / Number(proceso.pesoMojadoTotalKg)) *
          100 *
          100,
      ) / 100;

    return this.prisma.$transaction(async (tx) => {
      await tx.procesoSecado.update({
        where: { id },
        data: {
          estado: EstadoProcesoSecado.FINALIZADO,
          fechaFin: new Date(),
          pesoSecoResultanteKg: dto.pesoSecoResultanteKg,
          rendimientoPorcentaje,
        },
      });

      await tx.movimientoInventario.create({
        data: {
          tenantId,
          puntoCompraId: proceso.puntoCompraId,
          tipoCafe: TipoInventario.PERGAMINO,
          tipoMovimiento: TipoMovimientoInventario.ENTRADA,
          cantidadKg: dto.pesoSecoResultanteKg,
          origen: OrigenMovimientoInventario.PROCESO_SECADO,
          procesoSecadoId: id,
          createdById,
        },
      });

      return tx.procesoSecado.findUniqueOrThrow({
        where: { id },
        include: SECADO_DETAIL_INCLUDE,
      });
    });
  }
}
