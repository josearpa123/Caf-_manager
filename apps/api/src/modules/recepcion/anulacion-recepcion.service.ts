import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoFactura,
  EstadoRecepcion,
  OrigenMovimientoInventario,
  TipoCafeRecepcion,
  TipoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import {
  ejecutarConLlave,
  type PasosIdempotencia,
} from '../../prisma/idempotencia';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { sumarStock } from '../bodega/inventario.util';
import { AnularRecepcionDto } from './dto/anular-recepcion.dto';
import {
  RECEPCION_DETAIL_INCLUDE,
  RecepcionService,
} from './recepcion.service';

const ALCANCE_IDEMPOTENCIA = 'RECEPCION_ANULAR';

// Lo que devuelve la anulación: la recepción como la ve el detalle, más lo que
// se revirtió. Un reintento con la misma llave devuelve solo el detalle.
type RecepcionAnulada = Awaited<ReturnType<RecepcionService['findOne']>> & {
  pagosAnulados?: number;
  conciliacionesAnuladas?: number;
  notaAjusteDianPendiente?: boolean;
};

const INVENTARIO_POR_TIPO: Record<TipoCafeRecepcion, TipoInventario> = {
  [TipoCafeRecepcion.MOJADO]: TipoInventario.MOJADO,
  [TipoCafeRecepcion.PERGAMINO]: TipoInventario.PERGAMINO,
  [TipoCafeRecepcion.PASILLA]: TipoInventario.PASILLA,
};

// CU-02 · Anular recepción (RF-07, RF-08, ADR-010). Una recepción nunca se borra
// ni se edita en su plata: se marca ANULADA y se compensa el inventario con una
// salida; los pagos y conciliaciones asociados se marcan anulados (no se borran).
@Injectable()
export class AnulacionRecepcionService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
    private readonly recepciones: RecepcionService,
  ) {}

  // Con `llave` (Idempotency-Key) un reintento devuelve la recepción ya anulada
  // en vez de fallar con "ya está anulada" (regla de dominio 6).
  anular(
    tenantId: string,
    userId: string,
    recepcionId: string,
    dto: AnularRecepcionDto,
    llave?: string,
  ) {
    return ejecutarConLlave<RecepcionAnulada>({
      db: this.prisma,
      tenantId,
      alcance: ALCANCE_IDEMPOTENCIA,
      llave,
      cuerpo: { recepcionId, motivo: dto.motivo },
      obtener: (id) => this.recepciones.findOne(id),
      ejecutar: (pasos) => this.ejecutar(userId, recepcionId, dto, pasos),
    });
  }

  private async ejecutar(
    userId: string,
    recepcionId: string,
    dto: AnularRecepcionDto,
    pasos: PasosIdempotencia,
  ) {
    const existe = await this.prisma.recepcion.findUnique({
      where: { id: recepcionId },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Recepción no encontrada');

    return this.prisma.$transaction(async (tx) => {
      await pasos.reservar(tx);

      // Candado de fila: dos anulaciones simultáneas de la misma recepción se
      // serializan, y la segunda ve el estado ya cambiado.
      await tx.$queryRaw`SELECT "id" FROM "Recepcion" WHERE "id" = ${recepcionId} FOR UPDATE`;

      const recepcion = await tx.recepcion.findUniqueOrThrow({
        where: { id: recepcionId },
        include: {
          procesosSecado: {
            select: { procesoSecado: { select: { codigo: true } } },
          },
          ventasOrigen: { select: { venta: { select: { codigo: true } } } },
          factura: { select: { estado: true } },
        },
      });

      if (recepcion.estado === EstadoRecepcion.ANULADA) {
        throw new ConflictException(
          `La recepción ${recepcion.codigo} ya está anulada`,
        );
      }

      // RF-08: si ya hace parte de otro proceso, hay que revertir ese primero.
      if (recepcion.procesosSecado.length > 0) {
        const codigos = recepcion.procesosSecado
          .map((p) => p.procesoSecado.codigo)
          .join(', ');
        throw new ConflictException(
          `No se puede anular la recepción ${recepcion.codigo}: hace parte del secado ${codigos}. Revierte primero ese secado.`,
        );
      }
      if (recepcion.ventasOrigen.length > 0) {
        const codigos = recepcion.ventasOrigen
          .map((v) => v.venta.codigo)
          .join(', ');
        throw new ConflictException(
          `No se puede anular la recepción ${recepcion.codigo}: hace parte de la venta ${codigos}. Revierte primero esa venta.`,
        );
      }

      // La trilla y la mezcla de pasilla consumen el inventario del punto de
      // compra en conjunto, sin quedar ligadas a una recepción concreta. Si lo
      // que entró ya no está en bodega, algún proceso posterior se lo llevó.
      const inventario = INVENTARIO_POR_TIPO[recepcion.tipoCafe];
      const filas = await tx.movimientoInventario.groupBy({
        by: ['tipoMovimiento'],
        where: { puntoCompraId: recepcion.puntoCompraId, tipoCafe: inventario },
        _sum: { cantidadKg: true },
      });
      const disponible = sumarStock(filas);
      const peso = Number(recepcion.pesoNeto);
      if (disponible + 0.001 < peso) {
        throw new ConflictException(
          `No se puede anular la recepción ${recepcion.codigo}: en bodega quedan ${disponible} kg de ${inventario.toLowerCase()} y esta recepción aportó ${peso} kg. Parte de ese café ya salió en un proceso posterior (trilla, mezcla o venta); revierte primero ese proceso.`,
        );
      }

      const ahora = new Date();

      await tx.movimientoInventario.create({
        data: {
          tenantId: recepcion.tenantId,
          puntoCompraId: recepcion.puntoCompraId,
          tipoCafe: inventario,
          tipoMovimiento: TipoMovimientoInventario.SALIDA,
          cantidadKg: recepcion.pesoNeto,
          fecha: ahora,
          origen: OrigenMovimientoInventario.ANULACION_RECEPCION,
          recepcionId: recepcion.id,
          notas: `Anulación de ${recepcion.codigo}: ${dto.motivo}`,
          createdById: userId,
        },
      });

      // Pagos de la recepción y las conciliaciones de anticipo que los usaron o
      // que se aplicaron directamente a ella. Uno por uno para que cada cambio
      // quede en la auditoría.
      const pagos = await tx.pago.findMany({
        where: { recepcionId: recepcion.id, anuladoAt: null },
        select: { id: true },
      });
      const conciliaciones = await tx.conciliacionAnticipo.findMany({
        where: {
          anuladoAt: null,
          OR: [
            { recepcionId: recepcion.id },
            { pagoId: { in: pagos.map((p) => p.id) } },
          ],
        },
        select: { id: true },
      });
      for (const pago of pagos) {
        await tx.pago.update({
          where: { id: pago.id },
          data: {
            anuladoAt: ahora,
            motivoAnulacion: `Anulación de ${recepcion.codigo}`,
          },
        });
      }
      for (const conciliacion of conciliaciones) {
        await tx.conciliacionAnticipo.update({
          where: { id: conciliacion.id },
          data: { anuladoAt: ahora },
        });
      }

      await tx.recepcion.update({
        where: { id: recepcion.id },
        data: {
          estado: EstadoRecepcion.ANULADA,
          anuladaAt: ahora,
          anuladaPorId: userId,
          motivoAnulacion: dto.motivo,
        },
      });

      await pasos.completar(tx, recepcion.id);

      const anulada = await tx.recepcion.findUniqueOrThrow({
        where: { id: recepcion.id },
        include: RECEPCION_DETAIL_INCLUDE,
      });
      return {
        ...anulada,
        pagosAnulados: pagos.length,
        conciliacionesAnuladas: conciliaciones.length,
        // La cola de la nota de ajuste llega con BullMQ (Sprint 3): mientras
        // tanto se avisa para que quien administra la haga a mano.
        notaAjusteDianPendiente:
          recepcion.factura?.estado === EstadoFactura.EMITIDA,
      };
    });
  }
}
