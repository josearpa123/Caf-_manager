import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoContratoVenta,
  OrigenMovimientoInventario,
  Prisma,
  TipoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { BodegaService } from '../bodega/bodega.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';

const VENTA_LIST_INCLUDE = {
  puntoCompra: { select: { nombre: true } },
  comprador: { select: { nombre: true } },
} as const;

const VENTA_DETAIL_INCLUDE = {
  ...VENTA_LIST_INCLUDE,
  lotesOrigen: {
    include: {
      recepcion: {
        select: { id: true, codigo: true, proveedor: { select: { nombre: true } } },
      },
    },
  },
} as const;

@Injectable()
export class VentasService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
    private readonly bodegaService: BodegaService,
  ) {}

  findAll(query: QueryVentasDto) {
    const where: Prisma.VentaWhereInput = {
      puntoCompraId: query.puntoCompraId,
      compradorId: query.compradorId,
      tipoCafe: query.tipoCafe,
    };
    if (query.desde || query.hasta) {
      where.fecha = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(`${query.hasta}T23:59:59.999Z`) : undefined,
      };
    }
    return this.prisma.venta.findMany({
      where,
      include: VENTA_LIST_INCLUDE,
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: VENTA_DETAIL_INCLUDE,
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return venta;
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

  // Si la venta viene de un contrato, el tipo de café, precio y comprador
  // quedan fijados por el contrato (no por lo que mande el cliente), y se
  // valida que la cantidad no exceda el saldo pendiente de entrega.
  private async resolverContrato(contratoVentaId: string, cantidadKg: number) {
    const contrato = await this.prisma.contratoVenta.findUnique({
      where: { id: contratoVentaId },
    });
    if (!contrato)
      throw new BadRequestException('El contrato indicado no existe en este tenant');
    if (contrato.estado !== EstadoContratoVenta.VIGENTE) {
      throw new BadRequestException(
        'Este contrato no está vigente (ya fue cumplido o cancelado)',
      );
    }
    const saldoPendienteKg =
      Number(contrato.cantidadKgPactada) - Number(contrato.cantidadKgEntregada);
    if (cantidadKg > saldoPendienteKg) {
      throw new BadRequestException(
        `La cantidad excede el saldo pendiente del contrato (disponible: ${saldoPendienteKg.toFixed(2)} kg)`,
      );
    }
    return contrato;
  }

  async create(tenantId: string, createdById: string, dto: CreateVentaDto) {
    await this.assertPuntoCompraActivo(dto.puntoCompraId);

    const contrato = dto.contratoVentaId
      ? await this.resolverContrato(dto.contratoVentaId, dto.cantidadKg)
      : null;

    const tipoCafe: TipoInventario = contrato ? contrato.tipoCafe : dto.tipoCafe!;
    const precioKg = contrato ? Number(contrato.precioKg) : dto.precioKg!;
    const compradorId = contrato ? contrato.compradorId : dto.compradorId;
    const compradorNombre = contrato ? contrato.compradorNombre : dto.compradorNombre!;

    if (!contrato && dto.compradorId) {
      const comprador = await this.prisma.comprador.findUnique({
        where: { id: dto.compradorId },
      });
      if (!comprador)
        throw new BadRequestException('El comprador indicado no existe');
    }

    const sumaLotes =
      Math.round(
        dto.lotesOrigen.reduce((acc, l) => acc + l.cantidadKgAtribuida, 0) *
          100,
      ) / 100;
    if (Math.abs(sumaLotes - dto.cantidadKg) > 0.01) {
      throw new BadRequestException(
        `La suma de los lotes de origen (${sumaLotes} kg) no coincide con la cantidad vendida (${dto.cantidadKg} kg)`,
      );
    }

    const recepciones = await this.prisma.recepcion.findMany({
      where: { id: { in: dto.lotesOrigen.map((l) => l.recepcionId) } },
      select: { id: true },
    });
    if (recepciones.length !== new Set(dto.lotesOrigen.map((l) => l.recepcionId)).size) {
      throw new BadRequestException(
        'Una o más recepciones indicadas como lote de origen no existen en este tenant',
      );
    }

    const disponible = await this.bodegaService.getStockDisponible(
      dto.puntoCompraId,
      tipoCafe,
    );
    if (dto.cantidadKg > disponible) {
      throw new BadRequestException(
        `No hay suficiente inventario de ${tipoCafe} en este punto de compra (disponible: ${disponible.toFixed(2)} kg)`,
      );
    }

    const valorTotal = Math.round(dto.cantidadKg * precioKg * 100) / 100;
    const fecha = new Date();

    return this.prisma.$transaction(async (tx) => {
      const year = fecha.getUTCFullYear();
      const prefix = `VTA-${year}-`;
      const count = await tx.venta.count({
        where: { codigo: { startsWith: prefix } },
      });
      const codigo = `${prefix}${String(count + 1).padStart(6, '0')}`;

      const venta = await tx.venta.create({
        data: {
          tenantId,
          puntoCompraId: dto.puntoCompraId,
          codigo,
          fecha,
          tipoCafe,
          compradorId,
          compradorNombre,
          cantidadKg: dto.cantidadKg,
          precioKg,
          valorTotal,
          contratoVentaId: dto.contratoVentaId,
          observaciones: dto.observaciones,
          createdById,
        },
      });

      await tx.ventaLoteOrigen.createMany({
        data: dto.lotesOrigen.map((l) => ({
          ventaId: venta.id,
          recepcionId: l.recepcionId,
          cantidadKgAtribuida: l.cantidadKgAtribuida,
        })),
      });

      await tx.movimientoInventario.create({
        data: {
          tenantId,
          puntoCompraId: dto.puntoCompraId,
          tipoCafe,
          tipoMovimiento: TipoMovimientoInventario.SALIDA,
          cantidadKg: dto.cantidadKg,
          fecha,
          origen: OrigenMovimientoInventario.VENTA,
          ventaId: venta.id,
          createdById,
        },
      });

      if (contrato) {
        const entregadaTotal =
          Number(contrato.cantidadKgEntregada) + dto.cantidadKg;
        await tx.contratoVenta.update({
          where: { id: contrato.id },
          data: {
            cantidadKgEntregada: entregadaTotal,
            estado:
              entregadaTotal >= Number(contrato.cantidadKgPactada)
                ? EstadoContratoVenta.CUMPLIDO
                : undefined,
          },
        });
      }

      return tx.venta.findUniqueOrThrow({
        where: { id: venta.id },
        include: VENTA_DETAIL_INCLUDE,
      });
    });
  }
}
