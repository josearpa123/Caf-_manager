/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { BadRequestException } from '@nestjs/common';
import { TablaPreciosService } from './tabla-precios.service';

function build() {
  const prisma = {
    tablaPrecioTramo: { findMany: jest.fn(), create: jest.fn() },
  };

  return { service: new TablaPreciosService(prisma as any), prisma };
}

const fecha = new Date('2026-10-01T00:00:00.000Z');
const params = {
  fecha,
  puntoCompraId: 'pc1',
  humedad: 11,
  factorRendimiento: 90,
};

describe('TablaPreciosService', () => {
  describe('findMatch', () => {
    it('prefiere el tramo del punto de compra sobre el general', async () => {
      const { service, prisma } = build();
      prisma.tablaPrecioTramo.findMany.mockResolvedValue([
        { id: 'general', puntoCompraId: null },
        { id: 'punto', puntoCompraId: 'pc1' },
      ]);
      expect((await service.findMatch(params))?.id).toBe('punto');
    });

    it('usa el tramo general si no hay uno del punto', async () => {
      const { service, prisma } = build();
      prisma.tablaPrecioTramo.findMany.mockResolvedValue([
        { id: 'general', puntoCompraId: null },
      ]);
      expect((await service.findMatch(params))?.id).toBe('general');
    });

    it('devuelve null si ningún tramo aplica', async () => {
      const { service, prisma } = build();
      prisma.tablaPrecioTramo.findMany.mockResolvedValue([]);
      expect(await service.findMatch(params)).toBeNull();
    });

    it('consulta con rangos inclusivos de factor y humedad', async () => {
      const { service, prisma } = build();
      prisma.tablaPrecioTramo.findMany.mockResolvedValue([]);
      await service.findMatch(params);
      expect(prisma.tablaPrecioTramo.findMany.mock.calls[0][0].where).toEqual({
        fecha,
        OR: [{ puntoCompraId: 'pc1' }, { puntoCompraId: null }],
        factorMin: { lte: 90 },
        factorMax: { gte: 90 },
        humedadMin: { lte: 11 },
        humedadMax: { gte: 11 },
      });
    });
  });

  describe('precioVigente', () => {
    const query = { puntoCompraId: 'pc1', humedad: 11, factorRendimiento: 90 };

    it('devuelve el tramo y su precio como número', async () => {
      const { service, prisma } = build();
      prisma.tablaPrecioTramo.findMany.mockResolvedValue([
        {
          id: 'general',
          nombre: 'Primera',
          puntoCompraId: null,
          precioKg: '21500.00',
        },
      ]);
      expect(await service.precioVigente(query)).toEqual({
        tramoId: 'general',
        nombre: 'Primera',
        precioKg: 21500,
      });
    });

    it('sin tramo para esa calidad devuelve null', async () => {
      const { service, prisma } = build();
      prisma.tablaPrecioTramo.findMany.mockResolvedValue([]);
      expect(await service.precioVigente(query)).toBeNull();
    });
  });

  describe('findVigentes', () => {
    it('sin punto de compra no filtra por punto', async () => {
      const { service, prisma } = build();
      await service.findVigentes({ fecha: '2026-10-01' });
      const where = prisma.tablaPrecioTramo.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ fecha });
    });

    it('con punto de compra incluye los generales', async () => {
      const { service, prisma } = build();
      await service.findVigentes({
        fecha: '2026-10-01',
        puntoCompraId: 'pc1',
      });
      const where = prisma.tablaPrecioTramo.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { puntoCompraId: 'pc1' },
        { puntoCompraId: null },
      ]);
    });

    it('sin fecha usa hoy (UTC, a medianoche)', async () => {
      const { service, prisma } = build();
      await service.findVigentes({});
      const f: Date =
        prisma.tablaPrecioTramo.findMany.mock.calls[0][0].where.fecha;
      expect(f.toISOString().slice(10)).toBe('T00:00:00.000Z');
    });
  });

  describe('create', () => {
    const dto = {
      fecha: '2026-10-01',
      factorMin: 80,
      factorMax: 95,
      humedadMin: 10,
      humedadMax: 12,
      precioKg: 20000,
    };

    it('rechaza factorMin >= factorMax', async () => {
      const { service } = build();
      await expect(
        service.create('t1', 'u1', { ...dto, factorMin: 95 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza humedadMin >= humedadMax', async () => {
      const { service } = build();
      await expect(
        service.create('t1', 'u1', { ...dto, humedadMin: 12 }),
      ).rejects.toThrow(/humedad mínima/);
    });

    it('crea el tramo; punto de compra ausente = null (general)', async () => {
      const { service, prisma } = build();
      await service.create('t1', 'u1', dto);
      expect(
        prisma.tablaPrecioTramo.create.mock.calls[0][0].data,
      ).toMatchObject({
        tenantId: 't1',
        createdById: 'u1',
        fecha,
        puntoCompraId: null,
      });
    });
  });
});
