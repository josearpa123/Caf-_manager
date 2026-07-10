import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateConciliacionDto } from './dto/create-conciliacion.dto';
import { QueryConciliacionesDto } from './dto/query-conciliaciones.dto';

const CONCILIACION_INCLUDE = {
  proveedor: { select: { nombre: true } },
  anticipo: { select: { id: true, fecha: true, monto: true } },
  recepcion: { select: { codigo: true } },
  pago: { select: { id: true, fecha: true, monto: true } },
} as const;

@Injectable()
export class ConciliacionesService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll(query: QueryConciliacionesDto) {
    const where: Prisma.ConciliacionAnticipoWhereInput = {
      proveedorId: query.proveedorId,
      anticipoId: query.anticipoId,
    };
    return this.prisma.conciliacionAnticipo.findMany({
      where,
      include: CONCILIACION_INCLUDE,
      orderBy: { fecha: 'desc' },
    });
  }

  async create(
    tenantId: string,
    createdById: string,
    dto: CreateConciliacionDto,
  ) {
    if (!dto.recepcionId && !dto.pagoId) {
      throw new BadRequestException(
        'Se debe indicar recepcionId y/o pagoId para conciliar el anticipo',
      );
    }

    const anticipo = await this.prisma.anticipo.findUnique({
      where: { id: dto.anticipoId },
      include: { conciliaciones: { select: { montoAplicado: true } } },
    });
    if (!anticipo) throw new NotFoundException('Anticipo no encontrado');
    if (anticipo.proveedorId !== dto.proveedorId)
      throw new BadRequestException(
        'El anticipo indicado no pertenece a este proveedor',
      );

    if (dto.recepcionId) {
      const recepcion = await this.prisma.recepcion.findUnique({
        where: { id: dto.recepcionId },
      });
      if (!recepcion)
        throw new BadRequestException('La recepción indicada no existe');
      if (recepcion.proveedorId !== dto.proveedorId)
        throw new BadRequestException(
          'La recepción indicada no pertenece a este proveedor',
        );
    }

    if (dto.pagoId) {
      const pago = await this.prisma.pago.findUnique({
        where: { id: dto.pagoId },
      });
      if (!pago) throw new BadRequestException('El pago indicado no existe');
      if (pago.proveedorId !== dto.proveedorId)
        throw new BadRequestException(
          'El pago indicado no pertenece a este proveedor',
        );
    }

    const montoConciliado = anticipo.conciliaciones.reduce(
      (acc, c) => acc + Number(c.montoAplicado),
      0,
    );
    const saldoDisponible = Number(anticipo.monto) - montoConciliado;
    if (dto.montoAplicado > saldoDisponible) {
      throw new BadRequestException(
        `El monto aplicado (${dto.montoAplicado}) supera el saldo disponible del anticipo (${saldoDisponible})`,
      );
    }

    return this.prisma.conciliacionAnticipo.create({
      data: {
        tenantId,
        proveedorId: dto.proveedorId,
        anticipoId: dto.anticipoId,
        recepcionId: dto.recepcionId,
        pagoId: dto.pagoId,
        montoAplicado: dto.montoAplicado,
        notas: dto.notas,
        createdById,
      },
      include: CONCILIACION_INCLUDE,
    });
  }
}
