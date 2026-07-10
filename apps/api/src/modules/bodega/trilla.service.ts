import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrigenMovimientoInventario,
  TipoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { BodegaService } from './bodega.service';
import { CreateTrillaDto } from './dto/create-trilla.dto';
import { QueryPuntoCompraDto } from './dto/query-punto-compra.dto';

@Injectable()
export class TrillaService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
    private readonly bodegaService: BodegaService,
  ) {}

  findAll(query: QueryPuntoCompraDto) {
    return this.prisma.trillaProceso.findMany({
      where: query.puntoCompraId
        ? { puntoCompraId: query.puntoCompraId }
        : undefined,
      include: { puntoCompra: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const trilla = await this.prisma.trillaProceso.findUnique({
      where: { id },
      include: { puntoCompra: { select: { id: true, nombre: true } } },
    });
    if (!trilla) throw new NotFoundException('Proceso de trilla no encontrado');
    return trilla;
  }

  async create(tenantId: string, createdById: string, dto: CreateTrillaDto) {
    const punto = await this.prisma.puntoCompra.findUnique({
      where: { id: dto.puntoCompraId },
    });
    if (!punto)
      throw new BadRequestException(
        'El punto de compra no existe en este tenant',
      );
    if (!punto.activo)
      throw new BadRequestException('El punto de compra está inactivo');

    if (dto.pesoAlmendraKg > dto.pesoPergaminoKg) {
      throw new BadRequestException(
        'El peso de almendra no puede ser mayor al peso de pergamino trillado',
      );
    }

    const disponible = await this.bodegaService.getStockDisponible(
      dto.puntoCompraId,
      TipoInventario.PERGAMINO,
    );
    if (dto.pesoPergaminoKg > disponible) {
      throw new BadRequestException(
        `No hay suficiente inventario de pergamino en este punto de compra (disponible: ${disponible.toFixed(2)} kg)`,
      );
    }

    const rendimientoPorcentaje =
      Math.round((dto.pesoAlmendraKg / dto.pesoPergaminoKg) * 100 * 100) / 100;
    const fecha = new Date();

    return this.prisma.$transaction(async (tx) => {
      const year = fecha.getUTCFullYear();
      const prefix = `TRI-${year}-`;
      const count = await tx.trillaProceso.count({
        where: { codigo: { startsWith: prefix } },
      });
      const codigo = `${prefix}${String(count + 1).padStart(6, '0')}`;

      const trilla = await tx.trillaProceso.create({
        data: {
          tenantId,
          puntoCompraId: dto.puntoCompraId,
          codigo,
          fecha,
          pesoPergaminoKg: dto.pesoPergaminoKg,
          pesoAlmendraKg: dto.pesoAlmendraKg,
          pesoSubproductoKg: dto.pesoSubproductoKg,
          rendimientoPorcentaje,
          observaciones: dto.observaciones,
          createdById,
        },
      });

      const base = {
        tenantId,
        puntoCompraId: dto.puntoCompraId,
        origen: OrigenMovimientoInventario.PROCESO_TRILLA,
        trillaProcesoId: trilla.id,
        createdById,
      };
      await tx.movimientoInventario.create({
        data: {
          ...base,
          tipoCafe: TipoInventario.PERGAMINO,
          tipoMovimiento: TipoMovimientoInventario.SALIDA,
          cantidadKg: dto.pesoPergaminoKg,
        },
      });
      await tx.movimientoInventario.create({
        data: {
          ...base,
          tipoCafe: TipoInventario.ALMENDRA,
          tipoMovimiento: TipoMovimientoInventario.ENTRADA,
          cantidadKg: dto.pesoAlmendraKg,
        },
      });

      return trilla;
    });
  }
}
