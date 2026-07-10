import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateTablaPrecioTramoDto } from './dto/create-tabla-precio-tramo.dto';
import { QueryTablaPreciosDto } from './dto/query-tabla-precios.dto';

function parseFechaOnly(fecha?: string): Date {
  const iso = fecha ?? new Date().toISOString().slice(0, 10);
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

@Injectable()
export class TablaPreciosService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findVigentes(query: QueryTablaPreciosDto) {
    const fecha = parseFechaOnly(query.fecha);
    return this.prisma.tablaPrecioTramo.findMany({
      where: {
        fecha,
        ...(query.puntoCompraId
          ? {
              OR: [
                { puntoCompraId: query.puntoCompraId },
                { puntoCompraId: null },
              ],
            }
          : {}),
      },
      orderBy: [{ factorMin: 'asc' }],
    });
  }

  // Busca el tramo vigente para una recepción MOJADO dada su humedad/factor.
  // Prioriza tramos específicos de un punto de compra sobre los generales
  // del tenant (puntoCompraId = null).
  async findMatch(params: {
    fecha: Date;
    puntoCompraId: string;
    humedad: number;
    factorRendimiento: number;
  }) {
    const candidatos = await this.prisma.tablaPrecioTramo.findMany({
      where: {
        fecha: params.fecha,
        OR: [{ puntoCompraId: params.puntoCompraId }, { puntoCompraId: null }],
        factorMin: { lte: params.factorRendimiento },
        factorMax: { gte: params.factorRendimiento },
        humedadMin: { lte: params.humedad },
        humedadMax: { gte: params.humedad },
      },
    });
    return (
      candidatos.find((t) => t.puntoCompraId === params.puntoCompraId) ??
      candidatos.find((t) => t.puntoCompraId === null) ??
      null
    );
  }

  async create(
    tenantId: string,
    createdById: string,
    dto: CreateTablaPrecioTramoDto,
  ) {
    if (dto.factorMin >= dto.factorMax) {
      throw new BadRequestException(
        'El factor mínimo debe ser menor al factor máximo',
      );
    }
    if (dto.humedadMin >= dto.humedadMax) {
      throw new BadRequestException(
        'La humedad mínima debe ser menor a la máxima',
      );
    }
    return this.prisma.tablaPrecioTramo.create({
      data: {
        tenantId,
        createdById,
        fecha: parseFechaOnly(dto.fecha),
        puntoCompraId: dto.puntoCompraId ?? null,
        nombre: dto.nombre,
        factorMin: dto.factorMin,
        factorMax: dto.factorMax,
        humedadMin: dto.humedadMin,
        humedadMax: dto.humedadMax,
        precioKg: dto.precioKg,
      },
    });
  }
}
