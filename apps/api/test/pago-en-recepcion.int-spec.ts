import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AnulacionRecepcionService } from '../src/modules/recepcion/anulacion-recepcion.service';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL).
const prisma = new PrismaClient();
const run = Date.now().toString(36);

async function crearEscenario(nombre: string) {
  const tenant = await prisma.tenant.create({
    data: { nombre: `${nombre}-${run}` },
  });
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `${nombre}-${run}@test.local`,
      passwordHash: 'x',
      nombre,
    },
  });
  const punto = await prisma.puntoCompra.create({
    data: { tenantId: tenant.id, nombre: 'Punto' },
  });
  const crearProveedor = (sufijo: string) =>
    prisma.proveedor.create({
      data: {
        tenantId: tenant.id,
        tipoIdentificacion: 'CC',
        numeroIdentificacion: `${run}-${nombre}-${sufijo}`,
        nombre: `Proveedor ${sufijo}`,
        createdById: user.id,
      },
    });
  const proveedor = await crearProveedor('A');
  const otroProveedor = await crearProveedor('B');
  await prisma.configuracionTenant.create({
    data: {
      tenantId: tenant.id,
      humedadMinAceptable: 10,
      humedadMaxAceptable: 12,
    },
  });
  const scoped = prisma
    .$extends(tenantScopingExtension(tenant.id))
    .$extends(auditLogExtension(tenant.id, user.id));
  const recepciones = new RecepcionService(scoped, {} as never);
  const anulaciones = new AnulacionRecepcionService(scoped, recepciones);

  const anticipo = (monto: number, proveedorId = proveedor.id) =>
    prisma.anticipo.create({
      data: {
        tenantId: tenant.id,
        proveedorId,
        puntoCompraId: punto.id,
        monto,
        metodoPago: 'EFECTIVO',
        createdById: user.id,
      },
    });

  // 100 kg × $4.000 = $400.000 (sin retención: el negocio no es agente).
  const recibir = (
    pago?: Parameters<RecepcionService['create']>[2]['pago'],
    llave?: string,
  ) =>
    recepciones.create(
      tenant.id,
      user.id,
      {
        puntoCompraId: punto.id,
        proveedorId: proveedor.id,
        tipoCafe: 'MOJADO',
        pesoBruto: 100,
        pesoTara: 0,
        precioKg: 4000,
        pago,
      },
      llave,
    );

  return {
    tenant,
    user,
    proveedor,
    otroProveedor,
    recepciones,
    anulaciones,
    anticipo,
    recibir,
  };
}

const pagosDe = (tenantId: string) =>
  prisma.pago.findMany({ where: { tenantId } });
const conciliacionesDe = (tenantId: string) =>
  prisma.conciliacionAnticipo.findMany({ where: { tenantId } });

describe('Pago en el mismo paso de la recepción, RF-10 (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('sin `pago` la recepción queda por pagar, como antes', async () => {
    const e = await crearEscenario('sinpago');
    await e.recibir();
    expect(await pagosDe(e.tenant.id)).toHaveLength(0);
  });

  it('paga todo en efectivo: un Pago por el neto, ligado a la recepción', async () => {
    const e = await crearEscenario('efectivo');
    const rec = await e.recibir({ metodoPago: 'EFECTIVO' });

    const pagos = await pagosDe(e.tenant.id);
    expect(pagos).toHaveLength(1);
    expect(pagos[0].recepcionId).toBe(rec.id);
    expect(pagos[0].metodoPago).toBe('EFECTIVO');
    expect(pagos[0].monto.toString()).toBe('400000');
    expect(pagos[0].anuladoAt).toBeNull();
    expect(await conciliacionesDe(e.tenant.id)).toHaveLength(0);
  });

  it('anticipo parcial + resto en efectivo: conciliación y Pago por el saldo', async () => {
    const e = await crearEscenario('mixto');
    const anticipo = await e.anticipo(150000);
    const rec = await e.recibir({
      metodoPago: 'EFECTIVO',
      anticipos: [{ anticipoId: anticipo.id, montoAplicado: 150000 }],
    });

    const pagos = await pagosDe(e.tenant.id);
    expect(pagos).toHaveLength(1);
    expect(pagos[0].monto.toString()).toBe('250000');
    const conc = await conciliacionesDe(e.tenant.id);
    expect(conc).toHaveLength(1);
    expect(conc[0].recepcionId).toBe(rec.id);
    expect(conc[0].pagoId).toBe(pagos[0].id);
    expect(conc[0].montoAplicado.toString()).toBe('150000');
  });

  it('anticipos que cubren todo: sin Pago, solo conciliación', async () => {
    const e = await crearEscenario('soloanticipo');
    const anticipo = await e.anticipo(500000);
    await e.recibir({
      metodoPago: 'EFECTIVO',
      anticipos: [{ anticipoId: anticipo.id, montoAplicado: 400000 }],
    });

    expect(await pagosDe(e.tenant.id)).toHaveLength(0);
    const conc = await conciliacionesDe(e.tenant.id);
    expect(conc).toHaveLength(1);
    expect(conc[0].pagoId).toBeNull();
  });

  it('es atómico: si el anticipo no alcanza, no queda recepción, pago ni inventario', async () => {
    const e = await crearEscenario('atomico');
    const anticipo = await e.anticipo(100000);

    await expect(
      e.recibir({
        metodoPago: 'EFECTIVO',
        anticipos: [{ anticipoId: anticipo.id, montoAplicado: 100000.01 }],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      await prisma.recepcion.count({ where: { tenantId: e.tenant.id } }),
    ).toBe(0);
    expect(
      await prisma.movimientoInventario.count({
        where: { tenantId: e.tenant.id },
      }),
    ).toBe(0);
    expect(await pagosDe(e.tenant.id)).toHaveLength(0);
    expect(await conciliacionesDe(e.tenant.id)).toHaveLength(0);
  });

  it('rechaza el anticipo de otro proveedor', async () => {
    const e = await crearEscenario('ajeno');
    const ajeno = await e.anticipo(300000, e.otroProveedor.id);
    await expect(
      e.recibir({
        metodoPago: 'EFECTIVO',
        anticipos: [{ anticipoId: ajeno.id, montoAplicado: 1000 }],
      }),
    ).rejects.toThrow(/no pertenece a este proveedor/);
    expect(
      await prisma.recepcion.count({ where: { tenantId: e.tenant.id } }),
    ).toBe(0);
  });

  it('descuenta el saldo ya conciliado: el mismo anticipo no se usa dos veces', async () => {
    const e = await crearEscenario('saldo');
    const anticipo = await e.anticipo(300000);
    await e.recibir({
      metodoPago: 'EFECTIVO',
      anticipos: [{ anticipoId: anticipo.id, montoAplicado: 200000 }],
    });
    await expect(
      e.recibir({
        metodoPago: 'EFECTIVO',
        anticipos: [{ anticipoId: anticipo.id, montoAplicado: 150000 }],
      }),
    ).rejects.toThrow(/saldo suficiente/);
  });

  it('carrera: dos recepciones simultáneas con el mismo anticipo, solo una lo consume', async () => {
    const e = await crearEscenario('carrera');
    const anticipo = await e.anticipo(300000);
    const intento = () =>
      e.recibir({
        metodoPago: 'EFECTIVO',
        anticipos: [{ anticipoId: anticipo.id, montoAplicado: 300000 }],
      });

    const resultados = await Promise.allSettled([intento(), intento()]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);

    const conc = await conciliacionesDe(e.tenant.id);
    expect(conc).toHaveLength(1);
  });

  it('misma llave de idempotencia: una sola recepción y un solo pago', async () => {
    const e = await crearEscenario('idem');
    const llave = `pago-${run}`;
    const pago = { metodoPago: 'EFECTIVO' as const };
    const a = await e.recibir(pago, llave);
    const b = await e.recibir(pago, llave);

    expect(b.id).toBe(a.id);
    expect(
      await prisma.recepcion.count({ where: { tenantId: e.tenant.id } }),
    ).toBe(1);
    expect(await pagosDe(e.tenant.id)).toHaveLength(1);
  });

  it('anular la recepción revierte el pago y la conciliación del mismo paso', async () => {
    const e = await crearEscenario('anular');
    const anticipo = await e.anticipo(100000);
    const rec = await e.recibir({
      metodoPago: 'EFECTIVO',
      anticipos: [{ anticipoId: anticipo.id, montoAplicado: 100000 }],
    });

    await e.anulaciones.anular(
      e.tenant.id,
      e.user.id,
      rec.id,
      { motivo: 'Peso mal digitado por el operador' },
      `anu-${run}`,
    );

    const pagos = await pagosDe(e.tenant.id);
    expect(pagos).toHaveLength(1);
    expect(pagos[0].anuladoAt).not.toBeNull();
    const conc = await conciliacionesDe(e.tenant.id);
    expect(conc[0].anuladoAt).not.toBeNull();
  });
});
