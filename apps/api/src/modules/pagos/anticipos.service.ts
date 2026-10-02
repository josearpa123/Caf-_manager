import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ejecutarConLlave,
  type PasosIdempotencia,
} from '../../prisma/idempotencia';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateAnticipoDto } from './dto/create-anticipo.dto';
import { QueryAnticiposDto } from './dto/query-anticipos.dto';

const ANTICIPO_LIST_INCLUDE = {
  proveedor: { select: { nombre: true } },
  puntoCompra: { select: { nombre: true } },
} as const;

const ALCANCE_IDEMPOTENCIA = 'ANTICIPO';

@Injectable()
export class AnticiposService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll(query: QueryAnticiposDto) {
    const where: Prisma.AnticipoWhereInput = {
      proveedorId: query.proveedorId,
      puntoCompraId: query.puntoCompraId,
    };
    if (query.desde || query.hasta) {
      where.fecha = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(`${query.hasta}T23:59:59.999Z`) : undefined,
      };
    }
    return this.prisma.anticipo.findMany({
      where,
      include: ANTICIPO_LIST_INCLUDE,
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const anticipo = await this.prisma.anticipo.findUnique({
      where: { id },
      include: {
        ...ANTICIPO_LIST_INCLUDE,
        conciliaciones: {
          include: {
            recepcion: { select: { codigo: true } },
            pago: { select: { id: true, fecha: true, monto: true } },
          },
        },
      },
    });
    if (!anticipo) throw new NotFoundException('Anticipo no encontrado');
    const montoConciliado = anticipo.conciliaciones.reduce(
      (acc, c) => acc + Number(c.montoAplicado),
      0,
    );
    return {
      ...anticipo,
      montoConciliado,
      saldoDisponible: Number(anticipo.monto) - montoConciliado,
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

  // Con `llave` (encabezado Idempotency-Key) un reintento no duplica el
  // anticipo (regla de dominio 6, ADR-007).
  create(
    tenantId: string,
    createdById: string,
    dto: CreateAnticipoDto,
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
    dto: CreateAnticipoDto,
    pasos: PasosIdempotencia,
  ) {
    await this.assertProveedorActivo(dto.proveedorId);
    await this.assertPuntoCompraActivo(dto.puntoCompraId);

    return this.prisma.$transaction(async (tx) => {
      await pasos.reservar(tx);
      const anticipo = await tx.anticipo.create({
        data: {
          tenantId,
          proveedorId: dto.proveedorId,
          puntoCompraId: dto.puntoCompraId,
          monto: dto.monto,
          metodoPago: dto.metodoPago,
          referencia: dto.referencia,
          notas: dto.notas,
          createdById,
        },
        include: ANTICIPO_LIST_INCLUDE,
      });
      await pasos.completar(tx, anticipo.id);
      return anticipo;
    });
  }
}
