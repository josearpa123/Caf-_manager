import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContratoVenta, EstadoContratoVenta, Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateContratoVentaDto } from './dto/create-contrato-venta.dto';
import { QueryContratosVentaDto } from './dto/query-contratos-venta.dto';

const CONTRATO_INCLUDE = {
  puntoCompra: { select: { nombre: true } },
  comprador: { select: { nombre: true } },
} as const;

// El vencimiento es informativo (ver requerimientos: no bloquea ni cancela
// nada automáticamente), así que se calcula al vuelo en vez de guardarse.
function conDerivados<T extends ContratoVenta>(contrato: T) {
  const saldoPendienteKg =
    Number(contrato.cantidadKgPactada) - Number(contrato.cantidadKgEntregada);
  const vencido =
    contrato.estado === EstadoContratoVenta.VIGENTE &&
    contrato.fechaLimite !== null &&
    contrato.fechaLimite < new Date() &&
    saldoPendienteKg > 0;
  return { ...contrato, saldoPendienteKg, vencido };
}

@Injectable()
export class ContratosVentaService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  async findAll(query: QueryContratosVentaDto) {
    const where: Prisma.ContratoVentaWhereInput = {
      puntoCompraId: query.puntoCompraId,
      compradorId: query.compradorId,
      estado: query.estado,
    };
    const contratos = await this.prisma.contratoVenta.findMany({
      where,
      include: CONTRATO_INCLUDE,
      orderBy: { fecha: 'desc' },
    });
    return contratos.map(conDerivados);
  }

  async findOne(id: string) {
    const contrato = await this.prisma.contratoVenta.findUnique({
      where: { id },
      include: {
        ...CONTRATO_INCLUDE,
        ventas: {
          select: { id: true, codigo: true, fecha: true, cantidadKg: true, valorTotal: true },
          orderBy: { fecha: 'desc' },
        },
      },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado');
    return conDerivados(contrato);
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

  async create(
    tenantId: string,
    createdById: string,
    dto: CreateContratoVentaDto,
  ) {
    await this.assertPuntoCompraActivo(dto.puntoCompraId);

    if (dto.compradorId) {
      const comprador = await this.prisma.comprador.findUnique({
        where: { id: dto.compradorId },
      });
      if (!comprador)
        throw new BadRequestException('El comprador indicado no existe');
    }

    const fecha = new Date();
    const contrato = await this.prisma.$transaction(async (tx) => {
      const year = fecha.getUTCFullYear();
      const prefix = `CTR-${year}-`;
      const count = await tx.contratoVenta.count({
        where: { codigo: { startsWith: prefix } },
      });
      const codigo = `${prefix}${String(count + 1).padStart(6, '0')}`;

      return tx.contratoVenta.create({
        data: {
          tenantId,
          puntoCompraId: dto.puntoCompraId,
          codigo,
          fecha,
          compradorId: dto.compradorId,
          compradorNombre: dto.compradorNombre,
          tipoCafe: dto.tipoCafe,
          cantidadKgPactada: dto.cantidadKgPactada,
          precioKg: dto.precioKg,
          fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : undefined,
          observaciones: dto.observaciones,
          createdById,
        },
        include: CONTRATO_INCLUDE,
      });
    });

    return conDerivados(contrato);
  }

  async cancelar(id: string) {
    const contrato = await this.prisma.contratoVenta.findUnique({ where: { id } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado');
    if (contrato.estado !== EstadoContratoVenta.VIGENTE) {
      throw new BadRequestException(
        'Solo se puede cancelar un contrato vigente',
      );
    }
    const actualizado = await this.prisma.contratoVenta.update({
      where: { id },
      data: { estado: EstadoContratoVenta.CANCELADO },
      include: CONTRATO_INCLUDE,
    });
    return conDerivados(actualizado);
  }
}
