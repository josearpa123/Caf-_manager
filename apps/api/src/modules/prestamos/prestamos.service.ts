import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPrestamo, Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { CreateAbonoPrestamoDto } from './dto/create-abono-prestamo.dto';
import { QueryPrestamosDto } from './dto/query-prestamos.dto';

const PRESTAMO_LIST_INCLUDE = {
  proveedor: { select: { nombre: true } },
  puntoCompra: { select: { nombre: true } },
} as const;

// El préstamo devuelve `saldoPendiente` y `totalAbonado` calculados al vuelo a
// partir de sus abonos (no se persisten), coherente con el modelo de Anticipo.
function conSaldo<
  T extends { monto: Prisma.Decimal; abonos: { monto: Prisma.Decimal }[] },
>(prestamo: T) {
  const totalAbonado = prestamo.abonos.reduce(
    (acc, a) => acc + Number(a.monto),
    0,
  );
  return {
    ...prestamo,
    totalAbonado,
    saldoPendiente: Number(prestamo.monto) - totalAbonado,
  };
}

@Injectable()
export class PrestamosService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  async findAll(query: QueryPrestamosDto) {
    const where: Prisma.PrestamoWhereInput = {
      proveedorId: query.proveedorId,
      puntoCompraId: query.puntoCompraId,
      estado: query.estado,
    };
    if (query.desde || query.hasta) {
      where.fecha = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(`${query.hasta}T23:59:59.999Z`) : undefined,
      };
    }
    const prestamos = await this.prisma.prestamo.findMany({
      where,
      include: {
        ...PRESTAMO_LIST_INCLUDE,
        abonos: { select: { monto: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    return prestamos.map(conSaldo);
  }

  async findOne(id: string) {
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id },
      include: {
        ...PRESTAMO_LIST_INCLUDE,
        abonos: { orderBy: { fecha: 'desc' } },
      },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    return conSaldo(prestamo);
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

  async create(tenantId: string, createdById: string, dto: CreatePrestamoDto) {
    await this.assertProveedorActivo(dto.proveedorId);
    await this.assertPuntoCompraActivo(dto.puntoCompraId);

    const fecha = new Date();
    const prestamo = await this.prisma.$transaction(async (tx) => {
      const year = fecha.getUTCFullYear();
      const prefix = `PRE-${year}-`;
      const count = await tx.prestamo.count({
        where: { codigo: { startsWith: prefix } },
      });
      const codigo = `${prefix}${String(count + 1).padStart(6, '0')}`;

      return tx.prestamo.create({
        data: {
          tenantId,
          proveedorId: dto.proveedorId,
          puntoCompraId: dto.puntoCompraId,
          codigo,
          monto: dto.monto,
          fecha,
          notas: dto.notas,
          createdById,
        },
        include: {
          ...PRESTAMO_LIST_INCLUDE,
          abonos: { select: { monto: true } },
        },
      });
    });

    return conSaldo(prestamo);
  }

  async addAbono(
    id: string,
    tenantId: string,
    createdById: string,
    dto: CreateAbonoPrestamoDto,
  ) {
    const prestamo = await this.prisma.prestamo.findUnique({
      where: { id },
      include: { abonos: { select: { monto: true } } },
    });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    if (prestamo.estado !== EstadoPrestamo.VIGENTE) {
      throw new BadRequestException(
        'Solo se puede abonar a un préstamo vigente',
      );
    }

    const totalAbonado = prestamo.abonos.reduce(
      (acc, a) => acc + Number(a.monto),
      0,
    );
    const saldoPendiente = Number(prestamo.monto) - totalAbonado;
    if (dto.monto > saldoPendiente) {
      throw new BadRequestException(
        `El abono (${dto.monto}) supera el saldo pendiente del préstamo (${saldoPendiente})`,
      );
    }

    // Si el abono salda por completo el préstamo, se marca PAGADO en la misma
    // transacción (tolerancia de redondeo de 0.01).
    const saldadoCompleto = saldoPendiente - dto.monto <= 0.01;

    await this.prisma.$transaction(async (tx) => {
      await tx.abonoPrestamo.create({
        data: {
          tenantId,
          prestamoId: id,
          monto: dto.monto,
          metodoPago: dto.metodoPago,
          referencia: dto.referencia,
          notas: dto.notas,
          createdById,
        },
      });
      if (saldadoCompleto) {
        await tx.prestamo.update({
          where: { id },
          data: { estado: EstadoPrestamo.PAGADO },
        });
      }
    });

    return this.findOne(id);
  }

  async cancelar(id: string) {
    const prestamo = await this.prisma.prestamo.findUnique({ where: { id } });
    if (!prestamo) throw new NotFoundException('Préstamo no encontrado');
    if (prestamo.estado !== EstadoPrestamo.VIGENTE) {
      throw new BadRequestException(
        'Solo se puede cancelar un préstamo vigente',
      );
    }
    await this.prisma.prestamo.update({
      where: { id },
      data: { estado: EstadoPrestamo.CANCELADO },
    });
    return this.findOne(id);
  }
}
