import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MetodoPago, Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreatePagoDto } from './dto/create-pago.dto';
import { QueryPagosDto } from './dto/query-pagos.dto';

const PAGO_LIST_INCLUDE = {
  proveedor: { select: { nombre: true } },
  puntoCompra: { select: { nombre: true } },
  recepcion: { select: { codigo: true } },
} as const;

@Injectable()
export class PagosService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll(query: QueryPagosDto) {
    const where: Prisma.PagoWhereInput = {
      proveedorId: query.proveedorId,
      puntoCompraId: query.puntoCompraId,
      recepcionId: query.recepcionId,
    };
    if (query.desde || query.hasta) {
      where.fecha = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(`${query.hasta}T23:59:59.999Z`) : undefined,
      };
    }
    return this.prisma.pago.findMany({
      where,
      include: PAGO_LIST_INCLUDE,
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      include: {
        ...PAGO_LIST_INCLUDE,
        conciliaciones: {
          include: { anticipo: { select: { id: true, fecha: true, monto: true } } },
        },
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return pago;
  }

  private async assertProveedorActivo(proveedorId: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
    });
    if (!proveedor)
      throw new BadRequestException('El proveedor no existe en este tenant');
    if (!proveedor.activo)
      throw new BadRequestException('El proveedor está inactivo');
    return proveedor;
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

  async create(tenantId: string, createdById: string, dto: CreatePagoDto) {
    await this.assertProveedorActivo(dto.proveedorId);
    await this.assertPuntoCompraActivo(dto.puntoCompraId);

    if (dto.recepcionId) {
      const recepcion = await this.prisma.recepcion.findUnique({
        where: { id: dto.recepcionId },
      });
      if (!recepcion)
        throw new BadRequestException(
          'La recepción indicada no existe en este tenant',
        );
      if (recepcion.proveedorId !== dto.proveedorId)
        throw new BadRequestException(
          'La recepción indicada no pertenece a este proveedor',
        );
    }

    return this.prisma.pago.create({
      data: {
        tenantId,
        proveedorId: dto.proveedorId,
        puntoCompraId: dto.puntoCompraId,
        recepcionId: dto.recepcionId,
        monto: dto.monto,
        metodoPago: dto.metodoPago,
        referencia: dto.referencia,
        numeroCheque: dto.numeroCheque,
        notas: dto.notas,
        createdById,
      },
      include: PAGO_LIST_INCLUDE,
    });
  }

  // Resumen informativo de la cuenta del proveedor a partir de las
  // transacciones independientes (compras, anticipos, pagos, conciliaciones).
  // No es un saldo autoritativo: la reconciliación es manual por diseño (ver
  // docs/requerimientos.md, "Anticipos a proveedores").
  async estadoCuenta(proveedorId: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');

    const [recepciones, pagos, anticipos, conciliaciones, prestamosVigentes] =
      await Promise.all([
        this.prisma.recepcion.findMany({
          where: { proveedorId },
          select: { valorTotal: true },
        }),
        this.prisma.pago.findMany({
          where: { proveedorId },
          select: { monto: true, metodoPago: true },
        }),
        this.prisma.anticipo.findMany({
          where: { proveedorId },
          select: { monto: true },
        }),
        this.prisma.conciliacionAnticipo.findMany({
          where: { proveedorId },
          select: { montoAplicado: true },
        }),
        // Solo préstamos VIGENTES tienen saldo por cobrar: los PAGADOS ya
        // están en cero y los CANCELADOS se anularon.
        this.prisma.prestamo.findMany({
          where: { proveedorId, estado: 'VIGENTE' },
          select: { monto: true, abonos: { select: { monto: true } } },
        }),
      ]);

    const totalComprado = recepciones.reduce(
      (acc, r) => acc + Number(r.valorTotal),
      0,
    );
    const totalPagadoEfectivo = pagos
      .filter((p) => p.metodoPago !== MetodoPago.CREDITO)
      .reduce((acc, p) => acc + Number(p.monto), 0);
    const totalPagosCredito = pagos
      .filter((p) => p.metodoPago === MetodoPago.CREDITO)
      .reduce((acc, p) => acc + Number(p.monto), 0);
    const totalAnticipos = anticipos.reduce(
      (acc, a) => acc + Number(a.monto),
      0,
    );
    const totalConciliado = conciliaciones.reduce(
      (acc, c) => acc + Number(c.montoAplicado),
      0,
    );

    // Préstamos: dinero que el proveedor debe AL negocio (dirección opuesta a
    // las compras, que el negocio le debe a él).
    const totalPrestado = prestamosVigentes.reduce(
      (acc, p) => acc + Number(p.monto),
      0,
    );
    const totalAbonadoPrestamos = prestamosVigentes.reduce(
      (acc, p) => acc + p.abonos.reduce((s, a) => s + Number(a.monto), 0),
      0,
    );
    const saldoPrestamosPendiente = totalPrestado - totalAbonadoPrestamos;

    const saldoPendienteEstimado =
      totalComprado - totalPagadoEfectivo - totalConciliado;

    return {
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      totalComprado,
      totalPagadoEfectivo,
      totalPagosCredito,
      totalAnticipos,
      totalConciliado,
      anticiposSinConciliar: totalAnticipos - totalConciliado,
      saldoPendienteEstimado,
      totalPrestado,
      totalAbonadoPrestamos,
      saldoPrestamosPendiente,
      // Saldo neto entre lo que el negocio le debe (compras pendientes) y lo
      // que el proveedor debe (préstamos vigentes). Positivo = el negocio le
      // debe neto; negativo = el proveedor debe neto.
      saldoNeto: saldoPendienteEstimado - saldoPrestamosPendiente,
    };
  }
}
