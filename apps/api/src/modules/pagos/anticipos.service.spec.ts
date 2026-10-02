/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MetodoPago } from '@prisma/client';
import { hashSolicitud } from '../../prisma/idempotencia';
import { AnticiposService } from './anticipos.service';

function build() {
  const prisma: Record<string, any> = {
    $queryRaw: jest.fn().mockResolvedValue([{ llave: 'llave-1234' }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    anticipo: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'a1' }),
    },
    proveedor: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', activo: true }),
    },
    puntoCompra: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pc1', activo: true }),
    },
  };
  prisma.$transaction = jest.fn((fn: (t: unknown) => unknown) => fn(prisma));
  return { service: new AnticiposService(prisma as never), prisma };
}

const dto = {
  proveedorId: 'p1',
  puntoCompraId: 'pc1',
  monto: 200000,
  metodoPago: MetodoPago.EFECTIVO,
};

describe('AnticiposService', () => {
  it('create copia los datos y el usuario', async () => {
    const { service, prisma } = build();
    await service.create('t1', 'u1', { ...dto, referencia: 'r', notas: 'n' });
    expect(prisma.anticipo.create.mock.calls[0][0].data).toMatchObject({
      tenantId: 't1',
      proveedorId: 'p1',
      puntoCompraId: 'pc1',
      monto: 200000,
      referencia: 'r',
      notas: 'n',
      createdById: 'u1',
    });
  });

  it.each([
    ['proveedor inexistente', 'proveedor', null, /proveedor no existe/],
    ['proveedor inactivo', 'proveedor', { activo: false }, /inactivo/],
    ['punto inexistente', 'puntoCompra', null, /punto de compra no existe/],
    [
      'punto inactivo',
      'puntoCompra',
      { activo: false },
      /punto de compra está inactivo/,
    ],
  ] as const)('create: %s → 400', async (_n, modelo, valor, mensaje) => {
    const { service, prisma } = build();
    prisma[modelo].findUnique.mockResolvedValue(valor);
    await expect(service.create('t1', 'u1', dto)).rejects.toThrow(mensaje);
    expect(prisma.anticipo.create).not.toHaveBeenCalled();
  });

  it('findOne calcula monto conciliado y saldo disponible', async () => {
    const { service, prisma } = build();
    prisma.anticipo.findUnique.mockResolvedValue({
      id: 'a1',
      monto: '500000',
      conciliaciones: [{ montoAplicado: '120000' }, { montoAplicado: '30000' }],
    });
    const r = await service.findOne('a1');
    expect(r.montoConciliado).toBe(150000);
    expect(r.saldoDisponible).toBe(350000);
  });

  it('findOne sin conciliaciones: saldo = monto', async () => {
    const { service, prisma } = build();
    prisma.anticipo.findUnique.mockResolvedValue({
      id: 'a1',
      monto: '500000',
      conciliaciones: [],
    });
    const r = await service.findOne('a1');
    expect(r.montoConciliado).toBe(0);
    expect(r.saldoDisponible).toBe(500000);
  });

  it('findOne inexistente → 404', async () => {
    const { service, prisma } = build();
    prisma.anticipo.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });

  it('findAll arma filtros y rango de fechas inclusivo', async () => {
    const { service, prisma } = build();
    await service.findAll({
      proveedorId: 'p1',
      puntoCompraId: 'pc1',
      desde: '2026-10-01',
      hasta: '2026-10-02',
    });
    const arg = prisma.anticipo.findMany.mock.calls[0][0];
    expect(arg.where.proveedorId).toBe('p1');
    expect(arg.where.fecha.gte).toEqual(new Date('2026-10-01'));
    expect(arg.where.fecha.lte).toEqual(new Date('2026-10-02T23:59:59.999Z'));
  });

  it('findAll sin fechas no filtra por fecha', async () => {
    const { service, prisma } = build();
    await service.findAll({});
    expect(
      prisma.anticipo.findMany.mock.calls[0][0].where.fecha,
    ).toBeUndefined();
  });

  describe('create · idempotencia (Idempotency-Key)', () => {
    it('sin llave no toca la tabla de llaves', async () => {
      const { service, prisma } = build();
      await service.create('t1', 'u1', dto);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('llave nueva: reserva, crea y completa con el id del anticipo', async () => {
      const { service, prisma } = build();
      prisma.$queryRaw
        .mockResolvedValueOnce([]) // buscar: llave nueva
        .mockResolvedValueOnce([{ llave: 'llave-1234' }]); // reservar
      await service.create('t1', 'u1', dto, 'llave-1234');
      expect(prisma.anticipo.create).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRaw.mock.calls[0]).toContain('a1');
    });

    it('reintento: devuelve el anticipo previo sin crear otro', async () => {
      const { service, prisma } = build();
      prisma.$queryRaw.mockResolvedValueOnce([
        { hashSolicitud: hashSolicitud(dto), recursoId: 'a1' },
      ]);
      prisma.anticipo.findUnique.mockResolvedValue({
        id: 'a1',
        monto: 200000,
        conciliaciones: [],
      });
      const r = await service.create('t1', 'u1', dto, 'llave-1234');
      expect(r).toMatchObject({ id: 'a1', saldoDisponible: 200000 });
      expect(prisma.anticipo.create).not.toHaveBeenCalled();
    });

    it('misma llave con otro monto → 409', async () => {
      const { service, prisma } = build();
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          hashSolicitud: hashSolicitud({ ...dto, monto: 1 }),
          recursoId: 'a1',
        },
      ]);
      await expect(
        service.create('t1', 'u1', dto, 'llave-1234'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
