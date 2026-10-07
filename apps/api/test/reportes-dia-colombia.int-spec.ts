import { PrismaClient } from '@prisma/client';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';
import { ReportesService } from '../src/modules/reportes/reportes.service';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL).
const prisma = new PrismaClient();
const run = Date.now().toString(36);

describe('Reportes por día de Colombia (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('una compra de las 8 p. m. cuenta en su día, no en el siguiente', async () => {
    const tenant = await prisma.tenant.create({ data: { nombre: `rep-${run}` } });
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `rep-${run}@test.local`,
        passwordHash: 'x',
        nombre: 'rep',
      },
    });
    const punto = await prisma.puntoCompra.create({
      data: { tenantId: tenant.id, nombre: 'Punto' },
    });
    const proveedor = await prisma.proveedor.create({
      data: {
        tenantId: tenant.id,
        tipoIdentificacion: 'CC',
        numeroIdentificacion: `rep-${run}`,
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
    const r = await recepciones.create(tenant.id, user.id, {
      puntoCompraId: punto.id,
      proveedorId: proveedor.id,
      tipoCafe: 'MOJADO',
      pesoBruto: 100,
      pesoTara: 0,
      precioKg: 4000,
    });
    // 8 p. m. del 30-sep en Bogotá = 01:00 UTC del 1-oct
    await prisma.recepcion.update({
      where: { id: r.id },
      data: { fecha: new Date('2026-10-01T01:00:00Z') },
    });

    const reportes = new ReportesService(scoped, {
      getInventario: () => Promise.resolve([]),
    } as never);

    const septiembre = await reportes.dashboard({
      desde: '2026-09-30',
      hasta: '2026-09-30',
    });
    expect(septiembre.compras.totalValor).toBe(400000);

    const octubre = await reportes.dashboard({
      desde: '2026-10-01',
      hasta: '2026-10-01',
    });
    expect(octubre.compras.totalValor).toBe(0);

    const csv = await reportes.exportarComprasCsv({
      desde: '2026-09-30',
      hasta: '2026-09-30',
    });
    expect(csv).toContain('2026-09-30');
    expect(csv).not.toContain('2026-10-01');
  });
});
