/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConciliacionesService } from './conciliaciones.service';

function build() {
  const prisma = {
    conciliacionAnticipo: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
    },
    anticipo: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'a1',
        proveedorId: 'p1',
        monto: '500000',
        conciliaciones: [],
      }),
    },
    recepcion: {
      findUnique: jest.fn().mockResolvedValue({ id: 'r1', proveedorId: 'p1' }),
    },
    pago: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pg1', proveedorId: 'p1' }),
    },
  };
  return { service: new ConciliacionesService(prisma as never), prisma };
}

const dto = {
  proveedorId: 'p1',
  anticipoId: 'a1',
  recepcionId: 'r1',
  montoAplicado: 100000,
};

describe('ConciliacionesService', () => {
  it('concilia contra una recepción y copia los datos', async () => {
    const { service, prisma } = build();
    await service.create('t1', 'u1', { ...dto, notas: 'n' });
    expect(
      prisma.conciliacionAnticipo.create.mock.calls[0][0].data,
    ).toMatchObject({
      tenantId: 't1',
      proveedorId: 'p1',
      anticipoId: 'a1',
      recepcionId: 'r1',
      montoAplicado: 100000,
      notas: 'n',
      createdById: 'u1',
    });
  });

  it('concilia contra un pago', async () => {
    const { service, prisma } = build();
    await service.create('t1', 'u1', {
      proveedorId: 'p1',
      anticipoId: 'a1',
      pagoId: 'pg1',
      montoAplicado: 100000,
    });
    expect(
      prisma.conciliacionAnticipo.create.mock.calls[0][0].data.pagoId,
    ).toBe('pg1');
  });

  it('exige recepcionId y/o pagoId', async () => {
    const { service } = build();
    await expect(
      service.create('t1', 'u1', {
        proveedorId: 'p1',
        anticipoId: 'a1',
        montoAplicado: 1,
      }),
    ).rejects.toThrow(/recepcionId y\/o pagoId/);
  });

  it('anticipo inexistente → 404', async () => {
    const { service, prisma } = build();
    prisma.anticipo.findUnique.mockResolvedValue(null);
    await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('anticipo de otro proveedor → 400', async () => {
    const { service, prisma } = build();
    prisma.anticipo.findUnique.mockResolvedValue({
      id: 'a1',
      proveedorId: 'otro',
      monto: '500000',
      conciliaciones: [],
    });
    await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
      /anticipo indicado no pertenece/,
    );
  });

  it('recepción inexistente → 400', async () => {
    const { service, prisma } = build();
    prisma.recepcion.findUnique.mockResolvedValue(null);
    await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
      /recepción indicada no existe/,
    );
  });

  it('recepción de otro proveedor → 400', async () => {
    const { service, prisma } = build();
    prisma.recepcion.findUnique.mockResolvedValue({
      id: 'r1',
      proveedorId: 'otro',
    });
    await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
      /recepción indicada no pertenece/,
    );
  });

  it('pago inexistente → 400', async () => {
    const { service, prisma } = build();
    prisma.pago.findUnique.mockResolvedValue(null);
    await expect(
      service.create('t1', 'u1', {
        ...dto,
        recepcionId: undefined,
        pagoId: 'x',
      }),
    ).rejects.toThrow(/pago indicado no existe/);
  });

  it('pago de otro proveedor → 400', async () => {
    const { service, prisma } = build();
    prisma.pago.findUnique.mockResolvedValue({
      id: 'pg1',
      proveedorId: 'otro',
    });
    await expect(
      service.create('t1', 'u1', {
        ...dto,
        recepcionId: undefined,
        pagoId: 'pg1',
      }),
    ).rejects.toThrow(/pago indicado no pertenece/);
  });

  describe('saldo disponible del anticipo', () => {
    it('permite aplicar exactamente el saldo restante', async () => {
      const { service, prisma } = build();
      prisma.anticipo.findUnique.mockResolvedValue({
        id: 'a1',
        proveedorId: 'p1',
        monto: '500000',
        conciliaciones: [{ montoAplicado: '350000' }],
      });
      await service.create('t1', 'u1', { ...dto, montoAplicado: 150000 });
      expect(prisma.conciliacionAnticipo.create).toHaveBeenCalled();
    });

    it('rechaza aplicar más que el saldo restante', async () => {
      const { service, prisma } = build();
      prisma.anticipo.findUnique.mockResolvedValue({
        id: 'a1',
        proveedorId: 'p1',
        monto: '500000',
        conciliaciones: [
          { montoAplicado: '300000' },
          { montoAplicado: '50000' },
        ],
      });
      await expect(
        service.create('t1', 'u1', { ...dto, montoAplicado: 150001 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create('t1', 'u1', { ...dto, montoAplicado: 150001 }),
      ).rejects.toThrow(/supera el saldo disponible del anticipo \(150000\)/);
      expect(prisma.conciliacionAnticipo.create).not.toHaveBeenCalled();
    });
  });

  it('findAll filtra por proveedor y anticipo', async () => {
    const { service, prisma } = build();
    await service.findAll({ proveedorId: 'p1', anticipoId: 'a1' });
    expect(prisma.conciliacionAnticipo.findMany.mock.calls[0][0]).toMatchObject(
      {
        where: { proveedorId: 'p1', anticipoId: 'a1' },
        orderBy: { fecha: 'desc' },
      },
    );
  });
});
