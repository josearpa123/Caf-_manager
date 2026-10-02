/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
import { hashSolicitud } from '../../prisma/idempotencia';

function buildTx() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ llave: 'llave-1234' }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    recepcion: {
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
    $queryRaw: jest.fn().mockResolvedValue([{ valorActual: 1 }]),
    recepcion: { findMany: jest.fn(), findUnique: jest.fn() },
    configuracionTenant: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ taraPorSacoKg: 0.5, esAgenteRetencion: false }),
    },
    parametroTributario: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ valorUvt: 52374, umbralUvt: 70, tarifa: 0.005 }),
    },
    proveedor: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', activo: true }),
    },
    puntoCompra: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pc1', activo: true }),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    ) as jest.Mock,
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

  describe('create · tara por número de sacos', () => {
    const sinTara = (
      extra: Partial<CreateRecepcionDto> = {},
    ): CreateRecepcionDto => {
      const { pesoTara: _omitida, ...resto } = pergamino();
      void _omitida;
      return { ...resto, ...extra };
    };

    it('sin tara y con sacos: tara = sacos × peso del saco, y se guarda copiada', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', sinTara({ numeroSacos: 20 }));
      expect(dataCreada(tx)).toMatchObject({
        pesoTara: 10,
        numeroSacos: 20,
        pesoNeto: 100,
      });
    });

    it('redondea la tara a 2 decimales', async () => {
      const { service, prisma, tx } = buildService();
      prisma.configuracionTenant.findFirst.mockResolvedValue({
        taraPorSacoKg: 0.333,
      });
      await service.create('t1', 'u1', sinTara({ numeroSacos: 7 }));
      expect(dataCreada(tx).pesoTara).toBe(2.33);
    });

    it('una tara digitada manda sobre el cálculo por sacos', async () => {
      const { service, tx } = buildService();
      await service.create(
        't1',
        'u1',
        pergamino({ pesoTara: 4, numeroSacos: 20 }),
      );
      expect(dataCreada(tx)).toMatchObject({ pesoTara: 4, numeroSacos: 20 });
    });

    it('tara cero digitada es válida (no se confunde con "omitida")', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino({ pesoTara: 0 }));
      expect(dataCreada(tx).pesoTara).toBe(0);
    });

    it('sin tara ni sacos → 400', async () => {
      const { service, prisma } = buildService();
      await expect(service.create('t1', 'u1', sinTara())).rejects.toThrow(
        /pesoTara.*numeroSacos/,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('con sacos pero sin peso del saco configurado → 400', async () => {
      const { service, prisma } = buildService();
      prisma.configuracionTenant.findFirst.mockResolvedValue(null);
      await expect(
        service.create('t1', 'u1', sinTara({ numeroSacos: 20 })),
      ).rejects.toThrow(/taraPorSacoKg/);
    });

    it('la tara calculada que deja peso neto <= 0 → 400', async () => {
      const { service } = buildService();
      await expect(
        service.create('t1', 'u1', sinTara({ pesoBruto: 10, numeroSacos: 20 })),
      ).rejects.toThrow(/peso neto/);
    });
  });

  describe('create · retención en la fuente (CU-03)', () => {
    // 200 kg netos × $20.000 = $4.000.000 (> 70 UVT = $3.666.180)
    const grande = () => pergamino({ pesoBruto: 210, pesoTara: 10 });
    const agente = (b: ReturnType<typeof buildService>, esAgente = true) =>
      b.prisma.configuracionTenant.findFirst.mockResolvedValue({
        taraPorSacoKg: 0.5,
        esAgenteRetencion: esAgente,
      });

    it('agente + pergamino sobre el umbral: guarda base, tarifa, retención y neto a pagar', async () => {
      const b = buildService();
      agente(b);
      await b.service.create('t1', 'u1', grande());
      const data = dataCreada(b.tx);
      expect(data.valorTotal).toBe(4000000);
      expect(String(data.baseRetencion)).toBe('4000000');
      expect(String(data.tarifaRetencion)).toBe('0.005');
      expect(String(data.valorRetencion)).toBe('20000');
      expect(String(data.netoPagar)).toBe('3980000');
    });

    it('agente pero bajo el umbral: retención 0 y neto = valor total', async () => {
      const b = buildService();
      agente(b);
      await b.service.create('t1', 'u1', pergamino());
      const data = dataCreada(b.tx);
      expect(String(data.valorRetencion)).toBe('0');
      expect(String(data.netoPagar)).toBe('2000000');
      expect(data.baseRetencion).toBeNull();
    });

    it('no agente de retención: nunca retiene, aunque supere el umbral', async () => {
      const b = buildService();
      await b.service.create('t1', 'u1', grande());
      const data = dataCreada(b.tx);
      expect(String(data.valorRetencion)).toBe('0');
      expect(String(data.netoPagar)).toBe('4000000');
      expect(b.prisma.parametroTributario.findFirst).not.toHaveBeenCalled();
    });

    it('la pasilla no retiene aunque el negocio sea agente', async () => {
      const b = buildService();
      agente(b);
      await b.service.create('t1', 'u1', {
        puntoCompraId: 'pc1',
        proveedorId: 'p1',
        tipoCafe: TipoCafeRecepcion.PASILLA,
        pesoBruto: 1010,
        pesoTara: 10,
        precioKg: 5000,
      });
      expect(String(dataCreada(b.tx).valorRetencion)).toBe('0');
    });

    it('agente sin parámetro tributario vigente → 400 y no guarda nada', async () => {
      const b = buildService();
      agente(b);
      b.prisma.parametroTributario.findFirst.mockResolvedValue(null);
      await expect(b.service.create('t1', 'u1', grande())).rejects.toThrow(
        /parámetro tributario vigente/,
      );
      expect(b.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('busca el parámetro por la fecha de Colombia (regla 7), el más reciente vigente', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-02T01:30:00Z')); // 8:30 p. m. del 1-oct en Bogotá
      try {
        const b = buildService();
        agente(b);
        await b.service.create('t1', 'u1', grande());
        expect(b.prisma.parametroTributario.findFirst).toHaveBeenCalledWith({
          where: {
            concepto: 'RETENCION_COMPRA_CAFE',
            vigenteDesde: { lte: new Date('2026-10-01T00:00:00.000Z') },
          },
          orderBy: { vigenteDesde: 'desc' },
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('la vista previa usa la misma regla', async () => {
      const b = buildService();
      agente(b);
      const r = await b.service.previsualizarRetencion(
        TipoCafeRecepcion.PERGAMINO,
        5000000,
      );
      expect(r).toEqual({
        aplica: true,
        umbralPesos: '3666180',
        tarifaRetencion: '0.005',
        valorRetencion: '25000',
        netoPagar: '4975000',
      });
    });
  });

  describe('create · pergamino a precio directo por kilo', () => {
    const directo = (
      extra: Partial<CreateRecepcionDto> = {},
    ): CreateRecepcionDto => ({
      puntoCompraId: 'pc1',
      proveedorId: 'p1',
      tipoCafe: TipoCafeRecepcion.PERGAMINO,
      pesoBruto: 110,
      pesoTara: 10,
      precioKg: 18000,
      ...extra,
    });

    it('sin análisis de calidad usa el precio digitado, sin tabla de precios ni análisis', async () => {
      const { service, tx, tablaPrecios } = buildService();
      await service.create('t1', 'u1', directo());
      expect(dataCreada(tx)).toMatchObject({
        tipoCafe: TipoCafeRecepcion.PERGAMINO,
        precioKg: 18000,
        valorTotal: 1800000,
        tablaPrecioTramoId: null,
      });
      expect(tablaPrecios.findMatch).not.toHaveBeenCalled();
      expect(tx.analisisCalidad.create).not.toHaveBeenCalled();
    });

    it('entra al inventario de pergamino igual que el de calidad', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', directo());
      expect(
        tx.movimientoInventario.create.mock.calls[0][0].data,
      ).toMatchObject({
        tipoCafe: TipoInventario.PERGAMINO,
        cantidadKg: 100,
      });
    });

    it('calidad y precio a la vez → 400 (hay que elegir uno)', async () => {
      const { service, prisma } = buildService();
      await expect(
        service.create('t1', 'u1', pergamino({ precioKg: 18000 })),
      ).rejects.toThrow(/no ambos/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('ni calidad ni precio → 400', async () => {
      const { service } = buildService();
      await expect(
        service.create('t1', 'u1', directo({ precioKg: undefined })),
      ).rejects.toThrow(/precioKg/);
    });

    it('la retención también aplica al pergamino a precio directo', async () => {
      const b = buildService();
      b.prisma.configuracionTenant.findFirst.mockResolvedValue({
        taraPorSacoKg: 0.5,
        esAgenteRetencion: true,
      });
      // 200 kg × $20.000 = $4.000.000 ≥ 70 UVT
      await b.service.create(
        't1',
        'u1',
        directo({ pesoBruto: 210, precioKg: 20000 }),
      );
      expect(String(dataCreada(b.tx).valorRetencion)).toBe('20000');
    });
  });

  describe('create · día de Colombia', () => {
    it('a las 8:30 p. m. en Bogotá busca el precio del día de Bogotá, no el de UTC', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-02T01:30:00Z'));
      try {
        const { service, tablaPrecios } = buildService();
        await service.create('t1', 'u1', pergamino());
        expect(tablaPrecios.findMatch.mock.calls[0][0].fecha).toEqual(
          new Date('2026-10-01T00:00:00.000Z'),
        );
      } finally {
        jest.useRealTimers();
      }
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

    it('toma el código REC-<año>-NNNNNN del contador atómico', async () => {
      const { service, tx, prisma } = buildService();
      prisma.$queryRaw.mockResolvedValue([{ valorActual: 123 }]);
      await service.create('t1', 'u1', pergamino());
      expect(dataCreada(tx).codigo).toMatch(/^REC-\d{4}-000123$/);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it('si falla la validación previa no se consume consecutivo', async () => {
      const { service, prisma } = buildService();
      prisma.proveedor.findUnique.mockResolvedValue(null);
      await expect(service.create('t1', 'u1', pergamino())).rejects.toThrow();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
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

  describe('create · idempotencia (Idempotency-Key)', () => {
    const LLAVE = 'llave-1234';

    it('sin llave no toca la tabla de llaves', async () => {
      const { service, tx } = buildService();
      await service.create('t1', 'u1', pergamino());
      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it('llave nueva: reserva dentro de la transacción y la completa con el id creado', async () => {
      const { service, prisma, tx } = buildService();
      prisma.$queryRaw
        .mockResolvedValueOnce([]) // buscar: llave nueva
        .mockResolvedValueOnce([{ valorActual: 1 }]); // consecutivo
      await service.create('t1', 'u1', pergamino(), LLAVE);
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1); // reservar, primera sentencia
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1); // completar
      expect(tx.$executeRaw.mock.calls[0]).toContain('rec-1');
      expect(tx.recepcion.create).toHaveBeenCalledTimes(1);
    });

    it('reintento con la misma llave y cuerpo: devuelve la recepción previa sin crear nada', async () => {
      const { service, prisma, tx } = buildService();
      const dto = pergamino();
      prisma.$queryRaw.mockResolvedValueOnce([
        { hashSolicitud: hashSolicitud(dto), recursoId: 'rec-1' },
      ]);
      prisma.recepcion.findUnique.mockResolvedValue({ id: 'rec-1' });
      const r = await service.create('t1', 'u1', dto, LLAVE);
      expect(r).toEqual({ id: 'rec-1' });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.recepcion.create).not.toHaveBeenCalled();
      expect(prisma.proveedor.findUnique).not.toHaveBeenCalled();
    });

    it('misma llave con otro cuerpo → 409 y no crea nada', async () => {
      const { service, prisma, tx } = buildService();
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          hashSolicitud: hashSolicitud(pergamino({ pesoBruto: 50 })),
          recursoId: 'rec-1',
        },
      ]);
      await expect(
        service.create('t1', 'u1', pergamino(), LLAVE),
      ).rejects.toThrow(ConflictException);
      expect(tx.recepcion.create).not.toHaveBeenCalled();
    });

    it('carrera: otra petición confirmó la misma llave → rollback y devuelve la ganadora', async () => {
      const { service, prisma, tx } = buildService();
      const dto = pergamino();
      prisma.$queryRaw
        .mockResolvedValueOnce([]) // buscar: aún no existía
        .mockResolvedValueOnce([{ valorActual: 7 }]) // consecutivo (queda hueco)
        .mockResolvedValueOnce([
          { hashSolicitud: hashSolicitud(dto), recursoId: 'rec-9' },
        ]); // buscar tras perder la carrera
      tx.$queryRaw.mockResolvedValue([]); // reservar: ya existía vigente
      prisma.recepcion.findUnique.mockResolvedValue({ id: 'rec-9' });
      const r = await service.create('t1', 'u1', dto, LLAVE);
      expect(r).toEqual({ id: 'rec-9' });
      expect(tx.recepcion.create).not.toHaveBeenCalled();
    });
  });

  describe('contexto (recepción rápida)', () => {
    const conPuntos = (puntos: { id: string; nombre: string }[]) => {
      const b = buildService();
      (b.prisma as any).puntoCompra.findMany = jest
        .fn()
        .mockResolvedValue(puntos);
      return b;
    };

    it('un solo punto: queda como valor por defecto, y trae el peso del saco', async () => {
      const { service } = conPuntos([{ id: 'pc1', nombre: 'Central' }]);
      expect(await service.contexto(null)).toEqual({
        puntosCompra: [{ id: 'pc1', nombre: 'Central' }],
        puntoCompraIdPorDefecto: 'pc1',
        taraPorSacoKg: 0.5,
        esAgenteRetencion: false,
        modoCompraPergamino: 'CALIDAD',
      });
    });

    it('varios puntos: sin valor por defecto', async () => {
      const { service } = conPuntos([
        { id: 'a', nombre: 'A' },
        { id: 'b', nombre: 'B' },
      ]);
      expect((await service.contexto(null)).puntoCompraIdPorDefecto).toBeNull();
    });

    it('usuario asignado a un punto: solo consulta ese punto', async () => {
      const { service, prisma } = conPuntos([{ id: 'pc1', nombre: 'Central' }]);
      await service.contexto('pc1');
      expect(
        (prisma as any).puntoCompra.findMany.mock.calls[0][0].where,
      ).toEqual({ activo: true, id: 'pc1' });
    });

    it('sin peso del saco configurado devuelve null', async () => {
      const { service, prisma } = conPuntos([{ id: 'pc1', nombre: 'C' }]);
      prisma.configuracionTenant.findFirst.mockResolvedValue(null);
      expect((await service.contexto(null)).taraPorSacoKg).toBeNull();
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
