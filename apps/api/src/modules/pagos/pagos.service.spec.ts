/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MetodoPago } from '@prisma/client';
import { PagosService } from './pagos.service';

function build() {
  const prisma = {
    pago: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: 'pago-1' }),
    },
    proveedor: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', activo: true }),
    },
    puntoCompra: {
      findUnique: jest.fn().mockResolvedValue({ id: 'pc1', activo: true }),
    },
    recepcion: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    anticipo: { findMany: jest.fn().mockResolvedValue([]) },
    conciliacionAnticipo: { findMany: jest.fn().mockResolvedValue([]) },
    prestamo: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { service: new PagosService(prisma as never), prisma };
}

const dto = {
  proveedorId: 'p1',
  puntoCompraId: 'pc1',
  monto: 150000,
  metodoPago: MetodoPago.EFECTIVO,
};

describe('PagosService', () => {
  describe('create', () => {
    it('crea el pago copiando los datos y el usuario', async () => {
      const { service, prisma } = build();
      await service.create('t1', 'u1', {
        ...dto,
        referencia: 'ref',
        notas: 'n',
      });
      expect(prisma.pago.create.mock.calls[0][0].data).toMatchObject({
        tenantId: 't1',
        proveedorId: 'p1',
        puntoCompraId: 'pc1',
        monto: 150000,
        metodoPago: MetodoPago.EFECTIVO,
        referencia: 'ref',
        notas: 'n',
        createdById: 'u1',
      });
    });

    it('proveedor inexistente → 400', async () => {
      const { service, prisma } = build();
      prisma.proveedor.findUnique.mockResolvedValue(null);
      await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
        /proveedor no existe/,
      );
      expect(prisma.pago.create).not.toHaveBeenCalled();
    });

    it('proveedor inactivo → 400', async () => {
      const { service, prisma } = build();
      prisma.proveedor.findUnique.mockResolvedValue({ activo: false });
      await expect(service.create('t1', 'u1', dto)).rejects.toThrow(/inactivo/);
    });

    it('punto de compra inexistente → 400', async () => {
      const { service, prisma } = build();
      prisma.puntoCompra.findUnique.mockResolvedValue(null);
      await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
        /punto de compra no existe/,
      );
    });

    it('punto de compra inactivo → 400', async () => {
      const { service, prisma } = build();
      prisma.puntoCompra.findUnique.mockResolvedValue({ activo: false });
      await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
        /punto de compra está inactivo/,
      );
    });

    it('recepción inexistente → 400', async () => {
      const { service, prisma } = build();
      prisma.recepcion.findUnique.mockResolvedValue(null);
      await expect(
        service.create('t1', 'u1', { ...dto, recepcionId: 'r1' }),
      ).rejects.toThrow(/recepción indicada no existe/);
    });

    it('recepción de otro proveedor → 400', async () => {
      const { service, prisma } = build();
      prisma.recepcion.findUnique.mockResolvedValue({
        id: 'r1',
        proveedorId: 'otro',
      });
      await expect(
        service.create('t1', 'u1', { ...dto, recepcionId: 'r1' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.pago.create).not.toHaveBeenCalled();
    });

    it('recepción del mismo proveedor → crea el pago ligado', async () => {
      const { service, prisma } = build();
      prisma.recepcion.findUnique.mockResolvedValue({
        id: 'r1',
        proveedorId: 'p1',
      });
      await service.create('t1', 'u1', { ...dto, recepcionId: 'r1' });
      expect(prisma.pago.create.mock.calls[0][0].data.recepcionId).toBe('r1');
    });
  });

  describe('findAll / findOne', () => {
    it('findAll arma filtros y rango de fechas inclusivo', async () => {
      const { service, prisma } = build();
      await service.findAll({
        proveedorId: 'p1',
        puntoCompraId: 'pc1',
        recepcionId: 'r1',
        desde: '2026-10-01',
        hasta: '2026-10-02',
      });
      const arg = prisma.pago.findMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({
        proveedorId: 'p1',
        puntoCompraId: 'pc1',
        recepcionId: 'r1',
      });
      expect(arg.where.fecha.lte).toEqual(new Date('2026-10-02T23:59:59.999Z'));
      expect(arg.orderBy).toEqual({ fecha: 'desc' });
    });

    it('findAll sin fechas no filtra por fecha', async () => {
      const { service, prisma } = build();
      await service.findAll({});
      expect(prisma.pago.findMany.mock.calls[0][0].where.fecha).toBeUndefined();
    });

    it('findAll solo con desde (sin hasta)', async () => {
      const { service, prisma } = build();
      await service.findAll({ desde: '2026-10-01' });
      const fecha = prisma.pago.findMany.mock.calls[0][0].where.fecha;
      expect(fecha.gte).toEqual(new Date('2026-10-01'));
      expect(fecha.lte).toBeUndefined();
    });

    it('findOne devuelve el pago', async () => {
      const { service, prisma } = build();
      prisma.pago.findUnique.mockResolvedValue({ id: 'x' });
      await expect(service.findOne('x')).resolves.toEqual({ id: 'x' });
    });

    it('findOne inexistente → 404', async () => {
      const { service, prisma } = build();
      prisma.pago.findUnique.mockResolvedValue(null);
      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('estadoCuenta (saldos del proveedor)', () => {
    it('proveedor inexistente → 404', async () => {
      const { service, prisma } = build();
      prisma.proveedor.findUnique.mockResolvedValue(null);
      await expect(service.estadoCuenta('x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('proveedor sin movimientos: todo en cero', async () => {
      const { service } = build();
      const r = await service.estadoCuenta('p1');
      expect(r).toMatchObject({
        totalComprado: 0,
        totalPagadoEfectivo: 0,
        totalPagosCredito: 0,
        totalAnticipos: 0,
        totalConciliado: 0,
        anticiposSinConciliar: 0,
        saldoPendienteEstimado: 0,
        totalPrestado: 0,
        saldoPrestamosPendiente: 0,
        saldoNeto: 0,
      });
    });

    it('calcula comprado, pagado, anticipos, conciliado y saldo pendiente', async () => {
      const { service, prisma } = build();
      prisma.proveedor.findUnique.mockResolvedValue({
        id: 'p1',
        nombre: 'Don José',
      });
      prisma.recepcion.findMany.mockResolvedValue([
        { valorTotal: '1000000' },
        { valorTotal: '500000.50' },
      ]);
      prisma.pago.findMany.mockResolvedValue([
        { monto: '600000', metodoPago: MetodoPago.EFECTIVO },
        { monto: '100000', metodoPago: MetodoPago.TRANSFERENCIA },
        { monto: '50000', metodoPago: MetodoPago.CREDITO },
      ]);
      prisma.anticipo.findMany.mockResolvedValue([
        { monto: '300000' },
        { monto: '200000' },
      ]);
      prisma.conciliacionAnticipo.findMany.mockResolvedValue([
        { montoAplicado: '250000' },
      ]);

      const r = await service.estadoCuenta('p1');

      expect(r.proveedorNombre).toBe('Don José');
      expect(r.totalComprado).toBe(1500000.5);
      // CREDITO no cuenta como dinero entregado
      expect(r.totalPagadoEfectivo).toBe(700000);
      expect(r.totalPagosCredito).toBe(50000);
      expect(r.totalAnticipos).toBe(500000);
      expect(r.totalConciliado).toBe(250000);
      expect(r.anticiposSinConciliar).toBe(250000);
      // comprado - pagado - conciliado
      expect(r.saldoPendienteEstimado).toBe(1500000.5 - 700000 - 250000);
    });

    it('préstamos vigentes: saldo = prestado - abonos; solo consulta VIGENTE', async () => {
      const { service, prisma } = build();
      prisma.proveedor.findUnique.mockResolvedValue({ id: 'p1', nombre: 'X' });
      prisma.prestamo.findMany.mockResolvedValue([
        { monto: '400000', abonos: [{ monto: '100000' }, { monto: '50000' }] },
        { monto: '200000', abonos: [] },
      ]);
      const r = await service.estadoCuenta('p1');
      expect(prisma.prestamo.findMany.mock.calls[0][0].where).toEqual({
        proveedorId: 'p1',
        estado: 'VIGENTE',
      });
      expect(r.totalPrestado).toBe(600000);
      expect(r.totalAbonadoPrestamos).toBe(150000);
      expect(r.saldoPrestamosPendiente).toBe(450000);
    });

    it('saldoNeto = pendiente de compras - préstamos pendientes (negativo si el proveedor debe)', async () => {
      const { service, prisma } = build();
      prisma.proveedor.findUnique.mockResolvedValue({ id: 'p1', nombre: 'X' });
      prisma.recepcion.findMany.mockResolvedValue([{ valorTotal: '100000' }]);
      prisma.prestamo.findMany.mockResolvedValue([
        { monto: '300000', abonos: [] },
      ]);
      const r = await service.estadoCuenta('p1');
      expect(r.saldoPendienteEstimado).toBe(100000);
      expect(r.saldoNeto).toBe(-200000);
    });
  });
});
