import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AnulacionRecepcionService } from '../src/modules/recepcion/anulacion-recepcion.service';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';
import { PagosService } from '../src/modules/pagos/pagos.service';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL).
const prisma = new PrismaClient();
const run = Date.now().toString(36);
const MOTIVO = 'Peso mal digitado por el operador';

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
  const proveedor = await prisma.proveedor.create({
    data: {
      tenantId: tenant.id,
      tipoIdentificacion: 'CC',
      numeroIdentificacion: `${run}-${nombre}`,
      nombre: 'Proveedor Test',
      createdById: user.id,
    },
  });
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
  const pagos = new PagosService(scoped);

  const recibir = (
    pesoBruto = 100,
    tipoCafe: 'MOJADO' | 'PASILLA' = 'MOJADO',
  ) =>
    recepciones.create(tenant.id, user.id, {
      puntoCompraId: punto.id,
      proveedorId: proveedor.id,
      tipoCafe,
      pesoBruto,
      pesoTara: 0,
      precioKg: 4000,
    });

  const stock = async (tipoCafe: 'MOJADO' | 'PASILLA' = 'MOJADO') => {
    const filas = await prisma.movimientoInventario.groupBy({
      by: ['tipoMovimiento'],
      where: { tenantId: tenant.id, puntoCompraId: punto.id, tipoCafe },
      _sum: { cantidadKg: true },
    });
    return filas.reduce(
      (acc, f) =>
        acc +
        (f.tipoMovimiento === 'SALIDA' ? -1 : 1) * Number(f._sum.cantidadKg),
      0,
    );
  };

  return {
    tenant,
    user,
    punto,
    proveedor,
    recepciones,
    anulaciones,
    pagos,
    recibir,
    stock,
  };
}

describe('Anulación de recepciones (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('anula: estado, inventario compensado, pagos y conciliaciones revertidos, auditoría', async () => {
    const e = await crearEscenario('anula');
    const rec = await e.recibir(100);
    expect(await e.stock()).toBe(100);

    const pago = await e.pagos.create(e.tenant.id, e.user.id, {
      proveedorId: e.proveedor.id,
      puntoCompraId: e.punto.id,
      recepcionId: rec.id,
      monto: 400000,
      metodoPago: 'EFECTIVO',
    });
    const anticipo = await prisma.anticipo.create({
      data: {
        tenantId: e.tenant.id,
        proveedorId: e.proveedor.id,
        puntoCompraId: e.punto.id,
        monto: 100000,
        metodoPago: 'EFECTIVO',
        createdById: e.user.id,
      },
    });
    await prisma.conciliacionAnticipo.createMany({
      data: [
        {
          tenantId: e.tenant.id,
          proveedorId: e.proveedor.id,
          anticipoId: anticipo.id,
          recepcionId: rec.id,
          montoAplicado: 60000,
          createdById: e.user.id,
        },
        {
          tenantId: e.tenant.id,
          proveedorId: e.proveedor.id,
          anticipoId: anticipo.id,
          pagoId: pago.id,
          montoAplicado: 40000,
          createdById: e.user.id,
        },
      ],
    });
    const antes = await e.pagos.estadoCuenta(e.proveedor.id);
    expect(antes.totalComprado).toBe(400000);
    expect(antes.totalConciliado).toBe(100000);

    const r = await e.anulaciones.anular(e.tenant.id, e.user.id, rec.id, {
      motivo: MOTIVO,
    });

    expect(r.estado).toBe('ANULADA');
    expect(r.pagosAnulados).toBe(1);
    expect(r.conciliacionesAnuladas).toBe(2);
    const bd = await prisma.recepcion.findUniqueOrThrow({
      where: { id: rec.id },
    });
    expect(bd.estado).toBe('ANULADA');
    expect(bd.anuladaPorId).toBe(e.user.id);
    expect(bd.anuladaAt).toBeInstanceOf(Date);
    expect(bd.motivoAnulacion).toBe(MOTIVO);
    // La plata de la recepción no se tocó y la fila no se borró.
    expect(bd.valorTotal.toString()).toBe('400000');

    // Inventario: ledger con la entrada original + salida compensatoria.
    expect(await e.stock()).toBe(0);
    const movs = await prisma.movimientoInventario.findMany({
      where: { recepcionId: rec.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(movs.map((m) => [m.tipoMovimiento, m.origen])).toEqual([
      ['ENTRADA', 'RECEPCION'],
      ['SALIDA', 'ANULACION_RECEPCION'],
    ]);

    // Pagos y conciliaciones marcados, no borrados; el saldo ya no los cuenta.
    expect(
      (await prisma.pago.findUniqueOrThrow({ where: { id: pago.id } }))
        .anuladoAt,
    ).toBeInstanceOf(Date);
    expect(
      await prisma.conciliacionAnticipo.count({
        where: { anticipoId: anticipo.id, anuladoAt: { not: null } },
      }),
    ).toBe(2);
    const despues = await e.pagos.estadoCuenta(e.proveedor.id);
    expect(despues.totalComprado).toBe(0);
    expect(despues.totalPagadoEfectivo).toBe(0);
    expect(despues.totalConciliado).toBe(0);
    expect(despues.anticiposSinConciliar).toBe(100000);

    // Auditoría de la recepción, el pago y las conciliaciones.
    const auditoria = await prisma.auditLog.findMany({
      where: { tenantId: e.tenant.id, accion: 'EDITAR' },
    });
    expect(auditoria.map((a) => a.entidad).sort()).toEqual([
      'ConciliacionAnticipo',
      'ConciliacionAnticipo',
      'Pago',
      'Recepcion',
    ]);
  });

  it('no permite pagar ni anular dos veces una recepción anulada', async () => {
    const e = await crearEscenario('doble');
    const rec = await e.recibir(50);
    await e.anulaciones.anular(e.tenant.id, e.user.id, rec.id, {
      motivo: MOTIVO,
    });
    await expect(
      e.anulaciones.anular(e.tenant.id, e.user.id, rec.id, { motivo: MOTIVO }),
    ).rejects.toThrow(/ya está anulada/);
    await expect(
      e.pagos.create(e.tenant.id, e.user.id, {
        proveedorId: e.proveedor.id,
        puntoCompraId: e.punto.id,
        recepcionId: rec.id,
        monto: 1000,
        metodoPago: 'EFECTIVO',
      }),
    ).rejects.toThrow(/está anulada/);
    expect(await e.stock()).toBe(0);
  });

  it('RF-08: bloquea si la recepción está en un secado y no cambia nada', async () => {
    const e = await crearEscenario('secado');
    const rec = await e.recibir(100);
    const secado = await prisma.procesoSecado.create({
      data: {
        tenantId: e.tenant.id,
        puntoCompraId: e.punto.id,
        codigo: `SEC-${run}`,
        createdById: e.user.id,
      },
    });
    await prisma.procesoSecadoRecepcion.create({
      data: {
        procesoSecadoId: secado.id,
        recepcionId: rec.id,
        pesoMojadoAportadoKg: 100,
      },
    });

    await expect(
      e.anulaciones.anular(e.tenant.id, e.user.id, rec.id, { motivo: MOTIVO }),
    ).rejects.toThrow(new RegExp(`secado SEC-${run}`));

    const bd = await prisma.recepcion.findUniqueOrThrow({
      where: { id: rec.id },
    });
    expect(bd.estado).toBe('ACTIVA');
    expect(await e.stock()).toBe(100);
  });

  it('RF-08: bloquea si parte del café ya salió de bodega (trilla, mezcla, venta)', async () => {
    const e = await crearEscenario('stock');
    const rec = await e.recibir(100);
    await prisma.movimientoInventario.create({
      data: {
        tenantId: e.tenant.id,
        puntoCompraId: e.punto.id,
        tipoCafe: 'MOJADO',
        tipoMovimiento: 'SALIDA',
        cantidadKg: 30,
        origen: 'AJUSTE_MANUAL',
        createdById: e.user.id,
      },
    });
    await expect(
      e.anulaciones.anular(e.tenant.id, e.user.id, rec.id, { motivo: MOTIVO }),
    ).rejects.toThrow(/trilla, mezcla o venta/);
    expect(await e.stock()).toBe(70);
  });

  it('con la misma llave de idempotencia anula una sola vez', async () => {
    const e = await crearEscenario('llave');
    const rec = await e.recibir(80);
    const llave = `anula-${run}-12345`;
    const a = await e.anulaciones.anular(
      e.tenant.id,
      e.user.id,
      rec.id,
      { motivo: MOTIVO },
      llave,
    );
    const b = await e.anulaciones.anular(
      e.tenant.id,
      e.user.id,
      rec.id,
      { motivo: MOTIVO },
      llave,
    );
    expect(a.id).toBe(b.id);
    expect(b.estado).toBe('ANULADA');
    expect(
      await prisma.movimientoInventario.count({
        where: { recepcionId: rec.id, tipoMovimiento: 'SALIDA' },
      }),
    ).toBe(1);
    // La misma llave con otro motivo es un error del cliente, no un reintento.
    await expect(
      e.anulaciones.anular(
        e.tenant.id,
        e.user.id,
        rec.id,
        { motivo: 'Un motivo completamente distinto' },
        llave,
      ),
    ).rejects.toThrow(/otra solicitud distinta/);
  });

  it('dos anulaciones simultáneas (llaves distintas): una gana y la otra recibe 409', async () => {
    const e = await crearEscenario('carrera');
    const rec = await e.recibir(100);
    const lanzar = (llave: string) =>
      e.anulaciones.anular(
        e.tenant.id,
        e.user.id,
        rec.id,
        { motivo: MOTIVO },
        llave,
      );
    const resultados = await Promise.allSettled([
      lanzar(`carrera-${run}-aaaaaaaa`),
      lanzar(`carrera-${run}-bbbbbbbb`),
    ]);
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    expect(ok).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(rechazadas[0].reason).toBeInstanceOf(ConflictException);
    expect(
      await prisma.movimientoInventario.count({
        where: { recepcionId: rec.id, tipoMovimiento: 'SALIDA' },
      }),
    ).toBe(1);
    expect(await e.stock()).toBe(0);
  });

  it('otro negocio no puede anular una recepción ajena (404)', async () => {
    const a = await crearEscenario('negocioA');
    const b = await crearEscenario('negocioB');
    const rec = await a.recibir(100);
    await expect(
      b.anulaciones.anular(b.tenant.id, b.user.id, rec.id, { motivo: MOTIVO }),
    ).rejects.toThrow(/no encontrada/);
    const bd = await prisma.recepcion.findUniqueOrThrow({
      where: { id: rec.id },
    });
    expect(bd.estado).toBe('ACTIVA');
  });
});
