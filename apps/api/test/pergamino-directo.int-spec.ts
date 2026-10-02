import { PrismaClient } from '@prisma/client';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL).
const prisma = new PrismaClient();
const run = Date.now().toString(36);

describe('Café seco a precio por kilo (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('guarda la recepción de pergamino sin análisis ni tramo, con su inventario', async () => {
    const tenant = await prisma.tenant.create({
      data: { nombre: `directo-${run}` },
    });
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `directo-${run}@test.local`,
        passwordHash: 'x',
        nombre: 'u',
      },
    });
    const punto = await prisma.puntoCompra.create({
      data: { tenantId: tenant.id, nombre: 'P' },
    });
    const proveedor = await prisma.proveedor.create({
      data: {
        tenantId: tenant.id,
        tipoIdentificacion: 'CC',
        numeroIdentificacion: `${run}-d`,
        nombre: 'Prov',
        createdById: user.id,
      },
    });
    const scoped = prisma
      .$extends(tenantScopingExtension(tenant.id))
      .$extends(auditLogExtension(tenant.id, user.id));
    const service = new RecepcionService(scoped, {} as never);

    const r = await service.create(tenant.id, user.id, {
      puntoCompraId: punto.id,
      proveedorId: proveedor.id,
      tipoCafe: 'PERGAMINO',
      pesoBruto: 110,
      pesoTara: 10,
      precioKg: 18000,
    });

    expect(r.valorTotal.toString()).toBe('1800000');
    expect(r.tablaPrecioTramoId).toBeNull();
    expect(r.analisisCalidad).toBeNull();
    expect(
      await prisma.analisisCalidad.count({ where: { recepcionId: r.id } }),
    ).toBe(0);
    const mov = await prisma.movimientoInventario.findFirstOrThrow({
      where: { recepcionId: r.id },
    });
    expect(mov.tipoCafe).toBe('PERGAMINO');
    expect(mov.cantidadKg.toString()).toBe('100');
  });
});
