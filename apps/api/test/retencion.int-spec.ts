import { PrismaClient } from '@prisma/client';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL), que
// siembran el parámetro tributario de 2026 (UVT $52.374, 70 UVT, 0,5 %).
const prisma = new PrismaClient();
const run = Date.now().toString(36);

async function crearTenant(nombre: string, esAgenteRetencion: boolean) {
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
      esAgenteRetencion,
    },
  });
  const scoped = prisma
    .$extends(tenantScopingExtension(tenant.id))
    .$extends(auditLogExtension(tenant.id, user.id));
  // TablaPreciosService no se usa: MOJADO va con precio directo.
  const service = new RecepcionService(scoped, {} as never);
  const dto = (pesoBruto: number) => ({
    puntoCompraId: punto.id,
    proveedorId: proveedor.id,
    tipoCafe: 'MOJADO' as const,
    pesoBruto,
    pesoTara: 0,
    precioKg: 4000,
  });
  return { tenant, user, service, dto };
}

describe('Retención en la fuente (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('agente de retención sobre el umbral: guarda base, tarifa, retención y neto', async () => {
    const t = await crearTenant('agente', true);
    // 1.000 kg × $4.000 = $4.000.000 ≥ 70 UVT ($3.666.180)
    const r = await t.service.create(t.tenant.id, t.user.id, t.dto(1000));
    expect(r.valorTotal.toString()).toBe('4000000');
    expect(r.baseRetencion?.toString()).toBe('4000000');
    expect(r.tarifaRetencion?.toString()).toBe('0.005');
    expect(r.valorRetencion.toString()).toBe('20000');
    expect(r.netoPagar?.toString()).toBe('3980000');
  });

  it('inmutable: cambiar después la configuración no altera lo guardado (regla 3)', async () => {
    const t = await crearTenant('inmutable', true);
    const r = await t.service.create(t.tenant.id, t.user.id, t.dto(1000));
    await prisma.configuracionTenant.update({
      where: { tenantId: t.tenant.id },
      data: { esAgenteRetencion: false },
    });
    const guardada = await prisma.recepcion.findUniqueOrThrow({
      where: { id: r.id },
    });
    expect(guardada.valorRetencion.toString()).toBe('20000');
    expect(guardada.netoPagar?.toString()).toBe('3980000');
  });

  it('bajo el umbral no retiene; sin ser agente nunca retiene', async () => {
    const a = await crearTenant('bajo', true);
    const bajo = await a.service.create(a.tenant.id, a.user.id, a.dto(500)); // $2.000.000
    expect(bajo.valorRetencion.toString()).toBe('0');
    expect(bajo.netoPagar?.toString()).toBe('2000000');
    expect(bajo.baseRetencion).toBeNull();

    const b = await crearTenant('no-agente', false);
    const grande = await b.service.create(b.tenant.id, b.user.id, b.dto(1000));
    expect(grande.valorRetencion.toString()).toBe('0');
    expect(grande.netoPagar?.toString()).toBe('4000000');
  });

  it('el parámetro sembrado en la migración es el verificado de 2026', async () => {
    const p = await prisma.parametroTributario.findFirstOrThrow({
      where: {
        concepto: 'RETENCION_COMPRA_CAFE',
        vigenteDesde: new Date('2026-01-01'),
      },
    });
    expect(p.valorUvt.toString()).toBe('52374');
    expect(p.umbralUvt.toString()).toBe('70');
    expect(p.tarifa.toString()).toBe('0.005');
  });
});
