import { Injectable } from '@nestjs/common';
import { MetodoPago, Prisma, TipoCafeRecepcion } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { BodegaService } from '../bodega/bodega.service';
import { QueryReportesDto } from './dto/query-reportes.dto';

const TOP_PROVEEDORES_SALDO = 10;

function buildFechaWhere(
  desde?: string,
  hasta?: string,
): Prisma.DateTimeFilter | undefined {
  if (!desde && !hasta) return undefined;
  return {
    gte: desde ? new Date(desde) : undefined,
    lte: hasta ? new Date(`${hasta}T23:59:59.999Z`) : undefined,
  };
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
    private readonly bodegaService: BodegaService,
  ) {}

  // Estado de cuenta agregado por proveedor (misma fórmula informativa que
  // PagosService.estadoCuenta, pero calculada en lote para todos los
  // proveedores en vez de uno a la vez — ver esa nota sobre por qué el
  // saldo es estimado, no autoritativo).
  private async saldoPendienteProveedores() {
    const [compras, pagos, conciliaciones, proveedores] = await Promise.all([
      this.prisma.recepcion.groupBy({
        by: ['proveedorId'],
        _sum: { valorTotal: true },
      }),
      this.prisma.pago.groupBy({
        by: ['proveedorId'],
        where: { metodoPago: { not: MetodoPago.CREDITO } },
        _sum: { monto: true },
      }),
      this.prisma.conciliacionAnticipo.groupBy({
        by: ['proveedorId'],
        _sum: { montoAplicado: true },
      }),
      this.prisma.proveedor.findMany({ select: { id: true, nombre: true } }),
    ]);

    const totalComprado = new Map(
      compras.map((c) => [c.proveedorId, Number(c._sum.valorTotal ?? 0)]),
    );
    const totalPagado = new Map(
      pagos.map((p) => [p.proveedorId, Number(p._sum.monto ?? 0)]),
    );
    const totalConciliado = new Map(
      conciliaciones.map((c) => [c.proveedorId, Number(c._sum.montoAplicado ?? 0)]),
    );

    const porProveedor = proveedores
      .map((p) => {
        const saldoPendienteEstimado =
          (totalComprado.get(p.id) ?? 0) -
          (totalPagado.get(p.id) ?? 0) -
          (totalConciliado.get(p.id) ?? 0);
        return { proveedorId: p.id, proveedorNombre: p.nombre, saldoPendienteEstimado };
      })
      .filter((p) => p.saldoPendienteEstimado > 0)
      .sort((a, b) => b.saldoPendienteEstimado - a.saldoPendienteEstimado);

    return {
      totalEstimado: porProveedor.reduce((acc, p) => acc + p.saldoPendienteEstimado, 0),
      proveedores: porProveedor.slice(0, TOP_PROVEEDORES_SALDO),
    };
  }

  async dashboard(query: QueryReportesDto) {
    const fecha = buildFechaWhere(query.desde, query.hasta);
    const puntoCompraId = query.puntoCompraId;

    const [comprasPorTipo, analisisAgg, ventasPorTipo, inventario, saldoProveedores] =
      await Promise.all([
        this.prisma.recepcion.groupBy({
          by: ['tipoCafe'],
          where: { puntoCompraId, fecha },
          _sum: { pesoNeto: true, valorTotal: true },
          _count: true,
        }),
        this.prisma.analisisCalidad.aggregate({
          where: {
            recepcion: {
              puntoCompraId,
              fecha,
              tipoCafe: TipoCafeRecepcion.PERGAMINO,
            },
          },
          _avg: { humedad: true, factorRendimiento: true },
          _count: true,
        }),
        this.prisma.venta.groupBy({
          by: ['tipoCafe'],
          where: { puntoCompraId, fecha },
          _sum: { cantidadKg: true, valorTotal: true },
          _count: true,
        }),
        this.bodegaService.getInventario({ puntoCompraId }),
        this.saldoPendienteProveedores(),
      ]);

    const compras = {
      porTipo: comprasPorTipo.map((c) => ({
        tipoCafe: c.tipoCafe,
        kg: Number(c._sum.pesoNeto ?? 0),
        valor: Number(c._sum.valorTotal ?? 0),
        cantidad: c._count,
      })),
      totalKg: comprasPorTipo.reduce((acc, c) => acc + Number(c._sum.pesoNeto ?? 0), 0),
      totalValor: comprasPorTipo.reduce((acc, c) => acc + Number(c._sum.valorTotal ?? 0), 0),
    };

    const ventas = {
      porTipo: ventasPorTipo.map((v) => ({
        tipoCafe: v.tipoCafe,
        kg: Number(v._sum.cantidadKg ?? 0),
        valor: Number(v._sum.valorTotal ?? 0),
        cantidad: v._count,
      })),
      totalKg: ventasPorTipo.reduce((acc, v) => acc + Number(v._sum.cantidadKg ?? 0), 0),
      totalValor: ventasPorTipo.reduce((acc, v) => acc + Number(v._sum.valorTotal ?? 0), 0),
    };

    return {
      compras,
      ventas,
      margenBrutoPeriodo: ventas.totalValor - compras.totalValor,
      calidadPromedio: {
        humedadPromedio: analisisAgg._avg.humedad ? Number(analisisAgg._avg.humedad) : null,
        factorRendimientoPromedio: analisisAgg._avg.factorRendimiento
          ? Number(analisisAgg._avg.factorRendimiento)
          : null,
        muestras: analisisAgg._count,
      },
      inventario,
      saldoProveedores,
    };
  }

  async exportarComprasCsv(query: QueryReportesDto): Promise<string> {
    const recepciones = await this.prisma.recepcion.findMany({
      where: {
        puntoCompraId: query.puntoCompraId,
        fecha: buildFechaWhere(query.desde, query.hasta),
      },
      include: {
        proveedor: { select: { nombre: true } },
        puntoCompra: { select: { nombre: true } },
      },
      orderBy: { fecha: 'asc' },
    });

    const header = [
      'codigo',
      'fecha',
      'proveedor',
      'puntoCompra',
      'tipoCafe',
      'pesoNetoKg',
      'precioKg',
      'valorTotal',
    ].join(',');

    const rows = recepciones.map((r) =>
      [
        r.codigo,
        r.fecha.toISOString().slice(0, 10),
        csvEscape(r.proveedor.nombre),
        csvEscape(r.puntoCompra.nombre),
        r.tipoCafe,
        r.pesoNeto.toString(),
        r.precioKg.toString(),
        r.valorTotal.toString(),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
