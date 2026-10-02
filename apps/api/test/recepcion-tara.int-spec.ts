import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL).
const prisma = new PrismaClient();
const run = Date.now().toString(36);

async function crearTenant(nombre: string) {
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
  const scoped = prisma
    .$extends(tenantScopingExtension(tenant.id))
    .$extends(auditLogExtension(tenant.id, user.id));
  // TablaPreciosService no se usa: MOJADO va con precio directo.
  const service = new RecepcionService(scoped, {} as never);
  const dto = {
    puntoCompraId: punto.id,
    proveedorId: proveedor.id,
    tipoCafe: 'MOJADO' as const,
    pesoBruto: 120,
    numeroSacos: 20,
    precioKg: 4000,
  };
  return { tenant, user, service, dto };
}

describe('Tara por número de sacos (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('calcula y guarda la tara; cambiar el peso del saco después no la altera', async () => {
    const t = await crearTenant('tara');
    await prisma.configuracionTenant.create({
      data: {
        tenantId: t.tenant.id,
        humedadMinAceptable: 10,
        humedadMaxAceptable: 12,
        taraPorSacoKg: 0.5,
      },
    });
    const r = await t.service.create(t.tenant.id, t.user.id, t.dto);
    expect(Number(r.pesoTara)).toBe(10);
    expect(Number(r.pesoNeto)).toBe(110);
    expect(Number(r.valorTotal)).toBe(440000);
    expect(r.numeroSacos).toBe(20);

    await prisma.configuracionTenant.update({
      where: { tenantId: t.tenant.id },
      data: { taraPorSacoKg: 0.9 },
    });
    const guardada = await prisma.recepcion.findUniqueOrThrow({
      where: { id: r.id },
    });
    expect(Number(guardada.pesoTara)).toBe(10);
    expect(Number(guardada.pesoNeto)).toBe(110);
  });

  it('sin peso del saco configurado rechaza con 400 y no crea nada', async () => {
    const t = await crearTenant('sin-config');
    await expect(
      t.service.create(t.tenant.id, t.user.id, t.dto),
    ).rejects.toThrow(BadRequestException);
    expect(
      await prisma.recepcion.count({ where: { tenantId: t.tenant.id } }),
    ).toBe(0);
  });
});
