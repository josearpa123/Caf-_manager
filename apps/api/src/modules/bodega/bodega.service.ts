import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DestinoPasilla,
  OrigenMovimientoInventario,
  TipoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { sumarStock } from './inventario.util';
import { QueryPuntoCompraDto } from './dto/query-punto-compra.dto';
import { DecidirDestinoPasillaDto } from './dto/decidir-destino-pasilla.dto';

@Injectable()
export class BodegaService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  async getInventario(query: QueryPuntoCompraDto) {
    const grouped = await this.prisma.movimientoInventario.groupBy({
      by: ['puntoCompraId', 'tipoCafe', 'tipoMovimiento'],
      where: query.puntoCompraId
        ? { puntoCompraId: query.puntoCompraId }
        : undefined,
      _sum: { cantidadKg: true },
    });

    const porClave = new Map<
      string,
      { puntoCompraId: string; tipoCafe: TipoInventario; filas: typeof grouped }
    >();
    for (const fila of grouped) {
      const clave = `${fila.puntoCompraId}:${fila.tipoCafe}`;
      const entry = porClave.get(clave) ?? {
        puntoCompraId: fila.puntoCompraId,
        tipoCafe: fila.tipoCafe,
        filas: [],
      };
      entry.filas.push(fila);
      porClave.set(clave, entry);
    }

    const puntosCompra = await this.prisma.puntoCompra.findMany({
      select: { id: true, nombre: true },
    });
    const nombreParaPunto = new Map(puntosCompra.map((p) => [p.id, p.nombre]));

    return [...porClave.values()]
      .map((entry) => ({
        puntoCompraId: entry.puntoCompraId,
        puntoCompraNombre:
          nombreParaPunto.get(entry.puntoCompraId) ?? entry.puntoCompraId,
        tipoCafe: entry.tipoCafe,
        cantidadKg: sumarStock(entry.filas),
      }))
      .filter((row) => row.cantidadKg !== 0)
      .sort((a, b) => a.puntoCompraNombre.localeCompare(b.puntoCompraNombre));
  }

  async getStockDisponible(
    puntoCompraId: string,
    tipoCafe: TipoInventario,
  ): Promise<number> {
    const filas = await this.prisma.movimientoInventario.groupBy({
      by: ['tipoMovimiento'],
      where: { puntoCompraId, tipoCafe },
      _sum: { cantidadKg: true },
    });
    return sumarStock(filas);
  }

  async decidirDestinoPasilla(
    userId: string,
    recepcionId: string,
    dto: DecidirDestinoPasillaDto,
  ) {
    const recepcion = await this.prisma.recepcion.findUnique({
      where: { id: recepcionId },
    });
    if (!recepcion) throw new NotFoundException('Recepción no encontrada');
    if (recepcion.tipoCafe !== 'PASILLA') {
      throw new BadRequestException('Solo aplica a recepciones de pasilla');
    }
    if (recepcion.destinoPasilla) {
      throw new BadRequestException(
        'Esta recepción ya tiene un destino decidido',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.recepcion.update({
        where: { id: recepcionId },
        data: {
          destinoPasilla: dto.destino,
          fechaDecisionDestino: new Date(),
          decididoPorId: userId,
        },
      });

      if (dto.destino === DestinoPasilla.MEZCLA) {
        const base = {
          tenantId: recepcion.tenantId,
          puntoCompraId: recepcion.puntoCompraId,
          cantidadKg: recepcion.pesoNeto,
          origen: OrigenMovimientoInventario.MEZCLA_PASILLA,
          recepcionId: recepcion.id,
          createdById: userId,
        };
        await tx.movimientoInventario.create({
          data: {
            ...base,
            tipoCafe: TipoInventario.PASILLA,
            tipoMovimiento: TipoMovimientoInventario.SALIDA,
          },
        });
        await tx.movimientoInventario.create({
          data: {
            ...base,
            tipoCafe: TipoInventario.PERGAMINO,
            tipoMovimiento: TipoMovimientoInventario.ENTRADA,
          },
        });
      }

      return actualizada;
    });
  }
}
