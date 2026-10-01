/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ModoFactorRendimiento,
  OrigenMovimientoInventario,
  Prisma,
  TipoCafeRecepcion,
  TipoInventario,
  TipoMovimientoInventario,
} from '@prisma/client';
import { RecepcionService } from './recepcion.service';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';

function buildTx() {
  return {
    recepcion: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'rec-1' }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'rec-1' }),
    },
    movimientoInventario: { create: jest.fn() },
    analisisCalidad: { create: jest.fn().mockResolvedValue({ id: 'an-1' }) },
    defectoAnalisis: { createMany: jest.fn() },
  };
}

function buildService() {
  const tx = buildTx();
  const prisma = {
    recepcion: { findMany: jest.fn(), findUnique: jest.fn() },
    proveedor: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', activo: true }),
    },
    puntoCompra: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pc1', activo: true }),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const tablaPrecios = {
    findMatch: jest.fn().mockResolvedValue({ id: 'tramo-1', precioKg: 20000 }),
  };
  const service = new RecepcionService(
    prisma as any,

    tablaPrecios as any,
  );
  return { service, prisma, tx, tablaPrecios };
}

const pergamino = (
  overrides: Partial<CreateRecepcionDto> = {},
): CreateRecepcionDto => ({
  puntoCompraId: 'pc1',
  proveedorId: 'p1',
  tipoCafe: TipoCafeRecepcion.PERGAMINO,
  pesoBruto: 110,
  pesoTara: 10,
  analisisCalidad: {
    humedad: 11,
    modoFactor: ModoFactorRendimiento.CALCULADO,
    pesoMuestraKg: 0.5,
    pesoAlmendraMuestraKg: 0.4,
  },
  ...overrides,
});

const dataCreada = (tx: ReturnType<typeof buildTx>) =>
  tx.recepcion.create.mock.calls[0][0].data;

describe('RecepcionService', () => {
  describe('create · peso neto', () => {
    it('calcula peso neto = bruto - tara', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino());
      expect(dataCreada(tx).pesoNeto).toBe(100);
    });

    it('redondea el peso neto a 2 decimales', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino({ pesoBruto: 100.126 }));
      expect(dataCreada(tx).pesoNeto).toBe(90.13);
    });

    it.each([
      [100, 100],
      [100, 120],
    ])('rechaza peso neto <= 0 (bruto %p, tara %p)', async (bruto, tara) => {
      const { service, prisma } = buildService();
      await expect(
        service.create(
          't1',
          'u1',
          pergamino({ pesoBruto: bruto, pesoTara: tara }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('create · factor de rendimiento', () => {
    it('modo CALCULADO: (muestra / almendra) * 70', async () => {
      const { service, tablaPrecios } = buildService();
      await service.create('t1', 'u1', pergamino());
      // 0.5 / 0.4 * 70 = 87.5
      expect(tablaPrecios.findMatch.mock.calls[0][0].factorRendimiento).toBe(
        87.5,
      );
    });

    it('modo CALCULADO: redondea a 2 decimales', async () => {
      const { service, tablaPrecios } = buildService();
      await service.create(
        't1',
        'u1',
        pergamino({
          analisisCalidad: {
            humedad: 11,
            modoFactor: ModoFactorRendimiento.CALCULADO,
            pesoMuestraKg: 0.5,
            pesoAlmendraMuestraKg: 0.3,
          },
        }),
      );
      // 0.5 / 0.3 * 70 = 116.666… → 116.67
      expect(tablaPrecios.findMatch.mock.calls[0][0].factorRendimiento).toBe(
        116.67,
      );
    });

    it('modo CALCULADO exige muestra y almendra', async () => {
      const { service } = buildService();
      await expect(
        service.create(
          't1',
          'u1',
          pergamino({
            analisisCalidad: {
              humedad: 11,
              modoFactor: ModoFactorRendimiento.CALCULADO,
              pesoMuestraKg: 0.5,
            },
          }),
        ),
      ).rejects.toThrow(/pesoMuestraKg y pesoAlmendraMuestraKg/);
    });

    it('modo CALCULADO rechaza almendra mayor que la muestra', async () => {
      const { service } = buildService();
      await expect(
        service.create(
          't1',
          'u1',
          pergamino({
            analisisCalidad: {
              humedad: 11,
              modoFactor: ModoFactorRendimiento.CALCULADO,
              pesoMuestraKg: 0.4,
              pesoAlmendraMuestraKg: 0.5,
            },
          }),
        ),
      ).rejects.toThrow(/no puede ser mayor/);
    });

    it('modo MANUAL usa el factor dado', async () => {
      const { service, tablaPrecios } = buildService();
      await service.create(
        't1',
        'u1',
        pergamino({
          analisisCalidad: {
            humedad: 11,
            modoFactor: ModoFactorRendimiento.MANUAL,
            factorRendimiento: 92,
          },
        }),
      );
      expect(tablaPrecios.findMatch.mock.calls[0][0].factorRendimiento).toBe(
        92,
      );
    });

    it('modo MANUAL exige factorRendimiento', async () => {
      const { service } = buildService();
      await expect(
        service.create(
          't1',
          'u1',
          pergamino({
            analisisCalidad: {
              humedad: 11,
              modoFactor: ModoFactorRendimiento.MANUAL,
            },
          }),
        ),
      ).rejects.toThrow(/factorRendimiento/);
    });
  });

  describe('create · tramo de precio y valor total', () => {
    it('PERGAMINO: usa precio del tramo y copia precioKg/valorTotal', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino());
      const data = dataCreada(tx);
      expect(data.precioKg).toBe(20000);
      expect(data.valorTotal).toBe(2000000);
      expect(data.tablaPrecioTramoId).toBe('tramo-1');
    });

    it('busca el tramo con humedad y punto de compra', async () => {
      const { service, tablaPrecios } = buildService();
      await service.create('t1', 'u1', pergamino());
      expect(tablaPrecios.findMatch).toHaveBeenCalledWith(
        expect.objectContaining({ puntoCompraId: 'pc1', humedad: 11 }),
      );
    });

    it('redondea valorTotal a 2 decimales', async () => {
      const { service, tx, tablaPrecios } = buildService();
      tablaPrecios.findMatch.mockResolvedValue({
        id: 'tramo-1',
        precioKg: 18333.33,
      });
      await service.create('t1', 'u1', pergamino({ pesoBruto: 107.33 }));
      const data = dataCreada(tx);
      expect(data.pesoNeto).toBe(97.33);
      expect(data.valorTotal).toBe(Math.round(97.33 * 18333.33 * 100) / 100);
    });

    it('PERGAMINO sin tramo vigente → 400', async () => {
      const { service, tablaPrecios, prisma } = buildService();
      tablaPrecios.findMatch.mockResolvedValue(null);
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow(
        /No hay tabla de precios vigente/,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([TipoCafeRecepcion.MOJADO, TipoCafeRecepcion.PASILLA])(
      '%s: usa precio directo, sin análisis ni tabla de precios',
      async (tipoCafe) => {
        const { service, tx, tablaPrecios } = buildService();
        await service.create('t1', 'u1', {
          puntoCompraId: 'pc1',
          proveedorId: 'p1',
          tipoCafe,
          pesoBruto: 50,
          pesoTara: 0,
          precioKg: 4000,
        });
        const data = dataCreada(tx);
        expect(data.precioKg).toBe(4000);
        expect(data.valorTotal).toBe(200000);
        expect(data.tablaPrecioTramoId).toBeNull();
        expect(tablaPrecios.findMatch).not.toHaveBeenCalled();
        expect(tx.analisisCalidad.create).not.toHaveBeenCalled();
      },
    );

    it('MOJADO sin precioKg → 400', async () => {
      const { service } = buildService();
      await expect(
        service.create('t1', 'u1', {
          puntoCompraId: 'pc1',
          proveedorId: 'p1',
          tipoCafe: TipoCafeRecepcion.MOJADO,
          pesoBruto: 50,
          pesoTara: 0,
        }),
      ).rejects.toThrow(/precioKg/);
    });
  });

  describe('create · transacción', () => {
    it('crea movimiento de ENTRADA al inventario por el peso neto', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino());
      expect(tx.movimientoInventario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          tipoCafe: TipoInventario.PERGAMINO,
          tipoMovimiento: TipoMovimientoInventario.ENTRADA,
          cantidadKg: 100,
          origen: OrigenMovimientoInventario.RECEPCION,
          recepcionId: 'rec-1',
        }),
      });
    });

    it('PERGAMINO guarda análisis de calidad con el factor calculado', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino());
      expect(tx.analisisCalidad.create.mock.calls[0][0].data).toMatchObject({
        recepcionId: 'rec-1',
        humedad: 11,
        factorRendimiento: 87.5,
      });
    });

    it('guarda los defectos del análisis cuando vienen', async () => {
      const { service, tx } = buildService();
      await service.create(
        't1',
        'u1',
        pergamino({
          analisisCalidad: {
            humedad: 11,
            modoFactor: ModoFactorRendimiento.MANUAL,
            factorRendimiento: 90,
            defectos: [{ defectoTipoId: 'd1', pesoKg: 0.01 }],
          },
        }),
      );
      expect(tx.defectoAnalisis.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            analisisCalidadId: 'an-1',
            defectoTipoId: 'd1',
          }),
        ],
      });
    });

    it('sin defectos no llama createMany', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino());
      expect(tx.defectoAnalisis.createMany).not.toHaveBeenCalled();
    });

    it('arma el código REC-<año>-<n+1 con 6 dígitos>', async () => {
      const { service, tx } = buildService();
      tx.recepcion.count.mockResolvedValue(122);
      await service.create('t1', 'u1', pergamino());
      expect(dataCreada(tx).codigo).toMatch(/^REC-\d{4}-000123$/);
    });

    it('traduce P2003 (FK inválida) a 400', async () => {
      const { service, prisma } = buildService();
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('fk', {
          code: 'P2003',
          clientVersion: 'x',
        }),
      );
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('propaga otros errores sin traducir', async () => {
      const { service, prisma } = buildService();
      prisma.$transaction.mockRejectedValue(new Error('boom'));
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow(
        'boom',
      );
    });
  });

  describe('create · validaciones previas', () => {
    it('proveedor inexistente → 400', async () => {
      const { service, prisma } = buildService();
      prisma.proveedor.findUnique.mockResolvedValue(null);
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow(
        /proveedor no existe/,
      );
    });

    it('proveedor inactivo → 400', async () => {
      const { service, prisma } = buildService();
      prisma.proveedor.findUnique.mockResolvedValue({ activo: false });
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow(
        /inactivo/,
      );
    });

    it('punto de compra inexistente → 400', async () => {
      const { service, prisma } = buildService();
      prisma.puntoCompra.findUnique.mockResolvedValue(null);
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow(
        /punto de compra no existe/,
      );
    });

    it('punto de compra inactivo → 400', async () => {
      const { service, prisma } = buildService();
      prisma.puntoCompra.findUnique.mockResolvedValue({ activo: false });
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow(
        /punto de compra está inactivo/,
      );
    });
  });

  describe('findAll / findOne', () => {
    it('findAll arma filtros y rango de fechas (hasta inclusivo)', async () => {
      const { service, prisma } = buildService();
      await service.findAll({
        proveedorId: 'p1',
        puntoCompraId: 'pc1',
        tipoCafe: TipoCafeRecepcion.PERGAMINO,
        desde: '2026-10-01',
        hasta: '2026-10-02',
      });
      const arg = prisma.recepcion.findMany.mock.calls[0][0];
      expect(arg.where.proveedorId).toBe('p1');
      expect(arg.where.fecha.gte).toEqual(new Date('2026-10-01'));
      expect(arg.where.fecha.lte).toEqual(new Date('2026-10-02T23:59:59.999Z'));
      expect(arg.orderBy).toEqual({ fecha: 'desc' });
    });

    it('findAll sin fechas no filtra por fecha', async () => {
      const { service, prisma } = buildService();
      await service.findAll({});
      expect(
        prisma.recepcion.findMany.mock.calls[0][0].where.fecha,
      ).toBeUndefined();
    });

    it('findOne devuelve la recepción', async () => {
      const { service, prisma } = buildService();
      prisma.recepcion.findUnique.mockResolvedValue({ id: 'r1' });
      await expect(service.findOne('r1')).resolves.toEqual({ id: 'r1' });
    });

    it('findOne inexistente → 404', async () => {
      const { service, prisma } = buildService();
      prisma.recepcion.findUnique.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });
});
