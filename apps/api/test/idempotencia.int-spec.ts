import { ConflictException } from '@nestjs/common';
import { PrismaClient, TipoCafeRecepcion } from '@prisma/client';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL).
const prisma = new PrismaClient({
  datasourceUrl: `${process.env.DATABASE_URL}&connection_limit=20&pool_timeout=120`,
  transactionOptions: { maxWait: 60_000, timeout: 60_000 },
});
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
  const dto = (pesoBruto = 50) => ({
    puntoCompraId: punto.id,
    proveedorId: proveedor.id,
    tipoCafe: TipoCafeRecepcion.MOJADO,
    pesoBruto,
    pesoTara: 1,
    precioKg: 4000,
  });
  const contar = () =>
    prisma.recepcion.count({ where: { tenantId: tenant.id } });
  return { tenant, user, service, dto, contar };
}

describe('Idempotencia de recepciones (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('la misma llave y cuerpo dos veces crea una sola recepción y devuelve la misma', async () => {
    const { tenant, user, service, dto, contar } = await crearTenant('dos');
    const a = await service.create(tenant.id, user.id, dto(), 'llave-dos-001');
    const b = await service.create(tenant.id, user.id, dto(), 'llave-dos-001');
    expect(b.id).toBe(a.id);
    expect(b.codigo).toBe(a.codigo);
    expect(await contar()).toBe(1);
    expect(
      await prisma.movimientoInventario.count({
        where: { tenantId: tenant.id },
      }),
    ).toBe(1);
  });

  it('10 peticiones simultáneas con la misma llave crean una sola recepción', async () => {
    const { tenant, user, service, dto, contar } = await crearTenant('carrera');
    const resultados = await Promise.all(
      Array.from({ length: 10 }, () =>
        service.create(tenant.id, user.id, dto(), 'llave-carrera-1'),
      ),
    );
    expect(new Set(resultados.map((r) => r.id)).size).toBe(1);
    expect(await contar()).toBe(1);
    expect(
      await prisma.movimientoInventario.count({
        where: { tenantId: tenant.id },
      }),
    ).toBe(1);
  }, 60_000);

  it('misma llave con otro cuerpo → 409 y no crea otra', async () => {
    const { tenant, user, service, dto, contar } = await crearTenant('otro');
    await service.create(tenant.id, user.id, dto(50), 'llave-otro-0001');
    await expect(
      service.create(tenant.id, user.id, dto(60), 'llave-otro-0001'),
    ).rejects.toThrow(ConflictException);
    expect(await contar()).toBe(1);
  });

  it('llaves distintas crean recepciones distintas; sin llave no deduplica', async () => {
    const { tenant, user, service, dto, contar } = await crearTenant('varias');
    await service.create(tenant.id, user.id, dto(), 'llave-varias-01');
    await service.create(tenant.id, user.id, dto(), 'llave-varias-02');
    await service.create(tenant.id, user.id, dto());
    await service.create(tenant.id, user.id, dto());
    expect(await contar()).toBe(4);
  });

  it('la misma llave en tenants distintos no se mezcla', async () => {
    const a = await crearTenant('tenant-a');
    const b = await crearTenant('tenant-b');
    const ra = await a.service.create(
      a.tenant.id,
      a.user.id,
      a.dto(),
      'llave-comun-1',
    );
    const rb = await b.service.create(
      b.tenant.id,
      b.user.id,
      b.dto(),
      'llave-comun-1',
    );
    expect(rb.id).not.toBe(ra.id);
    expect(await a.contar()).toBe(1);
    expect(await b.contar()).toBe(1);
  });

  it('una llave vencida se acepta como operación nueva', async () => {
    const { tenant, user, service, dto, contar } = await crearTenant('vencida');
    const a = await service.create(tenant.id, user.id, dto(), 'llave-vence-01');
    await prisma.idempotencyKey.updateMany({
      where: { tenantId: tenant.id, llave: 'llave-vence-01' },
      data: { expiraEn: new Date(Date.now() - 1000) },
    });
    const b = await service.create(tenant.id, user.id, dto(), 'llave-vence-01');
    expect(b.id).not.toBe(a.id);
    expect(await contar()).toBe(2);
  });

  it('si la recepción falla, la llave no queda reservada y el reintento funciona', async () => {
    const { tenant, user, service, dto, contar } = await crearTenant('falla');
    const malo = { ...dto(), proveedorId: 'no-existe' };
    await expect(
      service.create(tenant.id, user.id, malo, 'llave-falla-001'),
    ).rejects.toThrow();
    expect(
      await prisma.idempotencyKey.count({ where: { tenantId: tenant.id } }),
    ).toBe(0);
    // el cliente corrige y reintenta con la misma llave
    await service.create(tenant.id, user.id, dto(), 'llave-falla-001');
    expect(await contar()).toBe(1);
  });
});
