import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoViaje, Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateViajeDto } from './dto/create-viaje.dto';

// Cliente dentro de una transacción interactiva: el mismo cliente extendido
// (con tenant-scoping) pero sin los métodos de nivel raíz ($transaction, etc.).
type TenantTx = Omit<
  TenantPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
import { UpdateViajeDto } from './dto/update-viaje.dto';
import { QueryViajesDto } from './dto/query-viajes.dto';

const VIAJE_VENTA_SELECT = {
  id: true,
  codigo: true,
  fecha: true,
  tipoCafe: true,
  compradorNombre: true,
  cantidadKg: true,
  valorTotal: true,
  puntoCompra: { select: { nombre: true } },
} as const;

// Resumen de una venta dentro de un viaje (números ya convertidos).
function toVentaResumen(v: {
  id: string;
  codigo: string;
  fecha: Date;
  tipoCafe: string;
  compradorNombre: string;
  cantidadKg: Prisma.Decimal;
  valorTotal: Prisma.Decimal;
  puntoCompra: { nombre: string };
}) {
  return {
    id: v.id,
    codigo: v.codigo,
    fecha: v.fecha.toISOString(),
    tipoCafe: v.tipoCafe,
    compradorNombre: v.compradorNombre,
    puntoCompraNombre: v.puntoCompra.nombre,
    cantidadKg: Number(v.cantidadKg),
    valorTotal: Number(v.valorTotal),
  };
}

function totalesDeVentas(ventas: { cantidadKg: number; valorTotal: number }[]) {
  const totalKg = ventas.reduce((acc, v) => acc + v.cantidadKg, 0);
  const totalValor = ventas.reduce((acc, v) => acc + v.valorTotal, 0);
  return {
    ventas: ventas.length,
    totalKg,
    totalValor,
    precioPromedioKg: totalKg > 0 ? totalValor / totalKg : 0,
  };
}

@Injectable()
export class ViajesService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  async create(tenantId: string, createdById: string, dto: CreateViajeDto) {
    const fecha = dto.fecha ? new Date(dto.fecha) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const year = fecha.getUTCFullYear();
      const prefix = `CORTE-${year}-`;
      const count = await tx.viaje.count({
        where: { codigo: { startsWith: prefix } },
      });
      const codigo = `${prefix}${String(count + 1).padStart(6, '0')}`;

      const viaje = await tx.viaje.create({
        data: {
          tenantId,
          codigo,
          fecha,
          destino: dto.destino,
          placa: dto.placa,
          observaciones: dto.observaciones,
          createdById,
        },
      });

      if (dto.ventaIds && dto.ventaIds.length > 0) {
        await this.asignarVentasInterno(tx, viaje.id, dto.ventaIds);
      }

      return viaje;
    });
  }

  async findAll(query: QueryViajesDto) {
    const where: Prisma.ViajeWhereInput = { estado: query.estado };
    if (query.desde || query.hasta) {
      where.fecha = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(`${query.hasta}T23:59:59.999Z`) : undefined,
      };
    }

    const viajes = await this.prisma.viaje.findMany({
      where,
      include: { ventas: { select: { cantidadKg: true, valorTotal: true } } },
      orderBy: { fecha: 'desc' },
    });

    return viajes.map((v) => {
      const ventas = v.ventas.map((venta) => ({
        cantidadKg: Number(venta.cantidadKg),
        valorTotal: Number(venta.valorTotal),
      }));
      return {
        id: v.id,
        codigo: v.codigo,
        fecha: v.fecha.toISOString(),
        destino: v.destino,
        placa: v.placa,
        estado: v.estado,
        observaciones: v.observaciones,
        ...totalesDeVentas(ventas),
      };
    });
  }

  async findOne(id: string) {
    const viaje = await this.prisma.viaje.findFirst({
      where: { id },
      include: {
        ventas: { select: VIAJE_VENTA_SELECT, orderBy: { fecha: 'asc' } },
      },
    });
    if (!viaje) throw new NotFoundException('El corte/viaje no existe');

    const ventas = viaje.ventas.map(toVentaResumen);
    return {
      id: viaje.id,
      codigo: viaje.codigo,
      fecha: viaje.fecha.toISOString(),
      destino: viaje.destino,
      placa: viaje.placa,
      estado: viaje.estado,
      observaciones: viaje.observaciones,
      ...totalesDeVentas(ventas),
      ventas,
    };
  }

  async update(id: string, dto: UpdateViajeDto) {
    await this.getViajeOrThrow(id);
    await this.prisma.viaje.update({
      where: { id },
      data: {
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        destino: dto.destino,
        placa: dto.placa,
        observaciones: dto.observaciones,
        estado: dto.estado,
      },
    });
    return this.findOne(id);
  }

  async asignarVentas(id: string, ventaIds: string[]) {
    const viaje = await this.getViajeOrThrow(id);
    if (viaje.estado === EstadoViaje.CERRADO) {
      throw new BadRequestException(
        'El corte está cerrado; reábrelo para modificar sus ventas',
      );
    }
    await this.prisma.$transaction((tx) =>
      this.asignarVentasInterno(tx, id, ventaIds),
    );
    return this.findOne(id);
  }

  async quitarVenta(id: string, ventaId: string) {
    const viaje = await this.getViajeOrThrow(id);
    if (viaje.estado === EstadoViaje.CERRADO) {
      throw new BadRequestException(
        'El corte está cerrado; reábrelo para modificar sus ventas',
      );
    }
    const venta = await this.prisma.venta.findFirst({
      where: { id: ventaId, viajeId: id },
      select: { id: true },
    });
    if (!venta) {
      throw new NotFoundException('La venta no pertenece a este corte');
    }
    await this.prisma.venta.update({
      where: { id: ventaId },
      data: { viajeId: null },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.getViajeOrThrow(id);
    await this.prisma.$transaction(async (tx) => {
      // Desasignar las ventas (no se borran; solo dejan de pertenecer al corte).
      await tx.venta.updateMany({
        where: { viajeId: id },
        data: { viajeId: null },
      });
      await tx.viaje.delete({ where: { id } });
    });
    return { ok: true };
  }

  // Ventas del tenant que aún no están asignadas a ningún corte — para la
  // pantalla que arma el viaje. Acepta filtros opcionales.
  async ventasSinAsignar(query: {
    puntoCompraId?: string;
    desde?: string;
    hasta?: string;
  }) {
    const where: Prisma.VentaWhereInput = {
      viajeId: null,
      puntoCompraId: query.puntoCompraId,
    };
    if (query.desde || query.hasta) {
      where.fecha = {
        gte: query.desde ? new Date(query.desde) : undefined,
        lte: query.hasta ? new Date(`${query.hasta}T23:59:59.999Z`) : undefined,
      };
    }
    const ventas = await this.prisma.venta.findMany({
      where,
      select: VIAJE_VENTA_SELECT,
      orderBy: { fecha: 'desc' },
    });
    return ventas.map(toVentaResumen);
  }

  private async getViajeOrThrow(id: string) {
    const viaje = await this.prisma.viaje.findFirst({ where: { id } });
    if (!viaje) throw new NotFoundException('El corte/viaje no existe');
    return viaje;
  }

  // Asigna ventas a un viaje validando que existan en el tenant y que no
  // pertenezcan ya a OTRO corte (evita mover ventas entre cortes en silencio).
  private async asignarVentasInterno(
    tx: TenantTx,
    viajeId: string,
    ventaIds: string[],
  ) {
    const ids = Array.from(new Set(ventaIds));
    const ventas = await tx.venta.findMany({
      where: { id: { in: ids } },
      select: { id: true, viajeId: true, codigo: true },
    });

    if (ventas.length !== ids.length) {
      throw new BadRequestException(
        'Una o más ventas no existen en este tenant',
      );
    }

    const enOtroCorte = ventas.filter(
      (v) => v.viajeId !== null && v.viajeId !== viajeId,
    );
    if (enOtroCorte.length > 0) {
      throw new BadRequestException(
        `Estas ventas ya pertenecen a otro corte: ${enOtroCorte
          .map((v) => v.codigo)
          .join(', ')}`,
      );
    }

    await tx.venta.updateMany({
      where: { id: { in: ids } },
      data: { viajeId },
    });
  }
}
