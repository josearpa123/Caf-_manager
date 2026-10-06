/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  OrigenMovimientoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AnulacionRecepcionService } from './anulacion-recepcion.service';
import { AnularRecepcionDto } from './dto/anular-recepcion.dto';
import { hashSolicitud } from '../../prisma/idempotencia';

const MOTIVO = 'Peso mal digitado por el operador';

function recepcionBase(extra: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    tenantId: 't1',
    codigo: 'REC-2026-000001',
    puntoCompraId: 'pc1',
    tipoCafe: 'PERGAMINO',
    estado: 'ACTIVA',
    pesoNeto: 100,
    procesosSecado: [],
    ventasOrigen: [],
    factura: null,
    ...extra,
  };
}

function build(
  opciones: {
    recepcion?: Record<string, unknown>;
    stockEntradas?: number;
    stockSalidas?: number;
    pagos?: { id: string }[];
    conciliaciones?: { id: string }[];
  } = {},
) {
  const recepcion = opciones.recepcion ?? recepcionBase();
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ llave: 'llave-1234' }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    recepcion: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValueOnce(recepcion)
        .mockResolvedValue({ ...recepcion, estado: 'ANULADA' }),
      update: jest.fn(),
    },
    movimientoInventario: {
      groupBy: jest.fn().mockResolvedValue([
        {
          tipoMovimiento: 'ENTRADA',
          _sum: { cantidadKg: opciones.stockEntradas ?? 100 },
        },
        {
          tipoMovimiento: 'SALIDA',
          _sum: { cantidadKg: opciones.stockSalidas ?? 0 },
        },
      ]),
      create: jest.fn(),
    },
    pago: {
      findMany: jest.fn().mockResolvedValue(opciones.pagos ?? []),
      update: jest.fn(),
    },
    conciliacionAnticipo: {
      findMany: jest.fn().mockResolvedValue(opciones.conciliaciones ?? []),
      update: jest.fn(),
    },
  };
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    recepcion: {
      findUnique: jest.fn().mockResolvedValue({ id: 'rec-1' }),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    ) as jest.Mock,
  };
  const recepciones = {
    findOne: jest.fn().mockResolvedValue({ id: 'rec-1', estado: 'ANULADA' }),
  };
  const service = new AnulacionRecepcionService(
    prisma as never,
    recepciones as never,
  );
  return { service, prisma, tx, recepciones };
}

const dto = (): AnularRecepcionDto => ({ motivo: MOTIVO });

describe('AnulacionRecepcionService', () => {
  it('marca la recepción ANULADA con quién, cuándo y por qué', async () => {
    const { service, tx } = build();
    await service.anular('t1', 'u1', 'rec-1', dto());
    expect(tx.recepcion.update).toHaveBeenCalledWith({
      where: { id: 'rec-1' },
      data: expect.objectContaining({
        estado: 'ANULADA',
        anuladaPorId: 'u1',
        motivoAnulacion: MOTIVO,
        anuladaAt: expect.any(Date),
      }),
    });
  });

  it('compensa el inventario con una salida por el mismo peso y no borra nada', async () => {
    const { service, tx } = build();
    await service.anular('t1', 'u1', 'rec-1', dto());
    expect(tx.movimientoInventario.create).toHaveBeenCalledTimes(1);
    expect(tx.movimientoInventario.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        tipoCafe: 'PERGAMINO',
        tipoMovimiento: TipoMovimientoInventario.SALIDA,
        cantidadKg: 100,
        origen: OrigenMovimientoInventario.ANULACION_RECEPCION,
        recepcionId: 'rec-1',
      }),
    );
  });

  it('anula los pagos y las conciliaciones asociados y los cuenta', async () => {
    const { service, tx } = build({
      pagos: [{ id: 'pg1' }, { id: 'pg2' }],
      conciliaciones: [{ id: 'cn1' }],
    });
    const r = await service.anular('t1', 'u1', 'rec-1', dto());
    expect(tx.pago.update).toHaveBeenCalledTimes(2);
    expect(tx.pago.update.mock.calls[0][0].data.anuladoAt).toBeInstanceOf(Date);
    expect(tx.conciliacionAnticipo.update).toHaveBeenCalledTimes(1);
    expect(r.pagosAnulados).toBe(2);
    expect(r.conciliacionesAnuladas).toBe(1);
    // Las conciliaciones se buscan por la recepción y por los pagos anulados.
    expect(tx.conciliacionAnticipo.findMany.mock.calls[0][0].where.OR).toEqual([
      { recepcionId: 'rec-1' },
      { pagoId: { in: ['pg1', 'pg2'] } },
    ]);
  });

  it('avisa que falta la nota de ajuste si ya había documento soporte emitido', async () => {
    const { service } = build({
      recepcion: recepcionBase({ factura: { estado: 'EMITIDA' } }),
    });
    const r = await service.anular('t1', 'u1', 'rec-1', dto());
    expect(r.notaAjusteDianPendiente).toBe(true);
  });

  it('RF-08: bloquea si está en un secado y dice cuál revertir primero', async () => {
    const { service, tx } = build({
      recepcion: recepcionBase({
        tipoCafe: 'MOJADO',
        procesosSecado: [{ procesoSecado: { codigo: 'SEC-2026-000007' } }],
      }),
    });
    const llamada = service.anular('t1', 'u1', 'rec-1', dto());
    await expect(llamada).rejects.toThrow(ConflictException);
    await expect(llamada).rejects.toThrow(/secado SEC-2026-000007/);
    expect(tx.recepcion.update).not.toHaveBeenCalled();
    expect(tx.movimientoInventario.create).not.toHaveBeenCalled();
  });

  it('RF-08: bloquea si está en una venta y dice cuál revertir primero', async () => {
    const { service, tx } = build({
      recepcion: recepcionBase({
        ventasOrigen: [{ venta: { codigo: 'VEN-2026-000003' } }],
      }),
    });
    await expect(service.anular('t1', 'u1', 'rec-1', dto())).rejects.toThrow(
      /venta VEN-2026-000003/,
    );
    expect(tx.recepcion.update).not.toHaveBeenCalled();
  });

  it('RF-08: bloquea si la trilla o una venta ya se llevó el café (el stock no alcanza)', async () => {
    const { service, tx } = build({ stockEntradas: 100, stockSalidas: 60 });
    const llamada = service.anular('t1', 'u1', 'rec-1', dto());
    await expect(llamada).rejects.toThrow(ConflictException);
    await expect(llamada).rejects.toThrow(/trilla, mezcla o venta/);
    expect(tx.movimientoInventario.create).not.toHaveBeenCalled();
    expect(tx.pago.update).not.toHaveBeenCalled();
  });

  it('deja anular cuando el stock alcanza justo', async () => {
    const { service, tx } = build({ stockEntradas: 100, stockSalidas: 0 });
    await service.anular('t1', 'u1', 'rec-1', dto());
    expect(tx.recepcion.update).toHaveBeenCalled();
  });

  it('una recepción ya anulada responde 409 y no repite el movimiento', async () => {
    const { service, tx } = build({
      recepcion: recepcionBase({ estado: 'ANULADA' }),
    });
    await expect(service.anular('t1', 'u1', 'rec-1', dto())).rejects.toThrow(
      /ya está anulada/,
    );
    expect(tx.movimientoInventario.create).not.toHaveBeenCalled();
  });

  it('una recepción de otro negocio o inexistente responde 404', async () => {
    const { service, prisma } = build();
    prisma.recepcion.findUnique.mockResolvedValue(null);
    await expect(service.anular('t1', 'u1', 'rec-x', dto())).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('bloquea la fila de la recepción antes de leer su estado', async () => {
    const { service, tx } = build();
    await service.anular('t1', 'u1', 'rec-1', dto());
    // Sin llave de idempotencia, el candado es la primera consulta cruda.
    const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join(
      '?',
    );
    expect(sql).toMatch(/FOR UPDATE/);
  });

  describe('idempotencia', () => {
    it('con una llave ya usada devuelve la recepción sin volver a anular', async () => {
      const { service, prisma, recepciones } = build();
      const hash = hashSolicitud({ recepcionId: 'rec-1', motivo: MOTIVO });
      prisma.$queryRaw.mockResolvedValue([
        { hashSolicitud: hash, recursoId: 'rec-1' },
      ]);
      const r = await service.anular('t1', 'u1', 'rec-1', dto(), 'llave-1234');
      expect(r).toEqual({ id: 'rec-1', estado: 'ANULADA' });
      expect(recepciones.findOne).toHaveBeenCalledWith('rec-1');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('la misma llave con otro motivo es un error del cliente (409)', async () => {
      const { service, prisma } = build();
      const otro = hashSolicitud({
        recepcionId: 'rec-1',
        motivo: 'Otro motivo distinto',
      });
      prisma.$queryRaw.mockResolvedValue([
        { hashSolicitud: otro, recursoId: 'rec-1' },
      ]);
      await expect(
        service.anular('t1', 'u1', 'rec-1', dto(), 'llave-1234'),
      ).rejects.toThrow(/otra solicitud distinta/);
    });

    it('la llave nueva se reserva y se completa dentro de la misma transacción', async () => {
      const { service, tx } = build();
      await service.anular('t1', 'u1', 'rec-1', dto(), 'llave-1234');
      // reservar (INSERT) abre la transacción; completar (UPDATE) la cierra.
      const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join(
        '?',
      );
      expect(sql).toMatch(/INSERT INTO "IdempotencyKey"/);
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AnularRecepcionDto', () => {
  const validar = (motivo: unknown) =>
    validate(plainToInstance(AnularRecepcionDto, { motivo }));

  it('acepta un motivo de 10 caracteres o más', async () => {
    expect(await validar('1234567890')).toHaveLength(0);
  });

  it('rechaza un motivo corto o vacío', async () => {
    expect(await validar('corto')).toHaveLength(1);
    expect(await validar('')).toHaveLength(1);
    expect(await validar(undefined)).toHaveLength(1);
  });

  it('no cuenta los espacios de los bordes', async () => {
    expect(await validar('   corto    ')).toHaveLength(1);
  });
});
