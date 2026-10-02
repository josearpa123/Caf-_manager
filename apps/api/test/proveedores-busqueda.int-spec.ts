import { PrismaClient } from '@prisma/client';
import { ProveedoresService } from '../src/modules/proveedores/proveedores.service';
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
  const service = new ProveedoresService(
    prisma.$extends(tenantScopingExtension(tenant.id)),
  );
  const proveedor = (
    numero: string,
    nombreProv: string,
    extra: { apodo?: string; activo?: boolean } = {},
  ) =>
    prisma.proveedor.create({
      data: {
        tenantId: tenant.id,
        tipoIdentificacion: 'CC',
        numeroIdentificacion: numero,
        nombre: nombreProv,
        createdById: user.id,
        ...extra,
      },
    });
  return { tenant, user, service, proveedor };
}

describe('Búsqueda de proveedores con pg_trgm (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('encuentra por nombre parcial, apodo y cédula parcial', async () => {
    const t = await crearTenant('buscar');
    await t.proveedor('10203040', 'Juan Carlos Pérez', { apodo: 'Chepe' });
    await t.proveedor('55667788', 'María Gómez');
    const nombres = async (q: string) =>
      (await t.service.buscar(t.tenant.id, { q })).map((r) => r.nombre);

    expect(await nombres('carlos')).toEqual(['Juan Carlos Pérez']);
    expect(await nombres('CHEP')).toEqual(['Juan Carlos Pérez']);
    expect(await nombres('1020')).toEqual(['Juan Carlos Pérez']);
    expect(await nombres('5566')).toEqual(['María Gómez']);
    expect(await nombres('zzzz')).toEqual([]);
  });

  it('tolera errores de digitación', async () => {
    const t = await crearTenant('typo');
    await t.proveedor('1', 'Hernando Ramírez');
    const r = await t.service.buscar(t.tenant.id, { q: 'Hernado Ramirez' });
    expect(r.map((x) => x.nombre)).toEqual(['Hernando Ramírez']);
  });

  it('la cédula que empieza igual va primero; después, el más parecido', async () => {
    const t = await crearTenant('orden');
    await t.proveedor('999', 'Pedro 123 Suárez');
    await t.proveedor('123456', 'Ana López');
    const r = await t.service.buscar(t.tenant.id, { q: '123' });
    expect(r.map((x) => x.numeroIdentificacion)).toEqual(['123456', '999']);
  });

  it('solo activos y solo del tenant', async () => {
    const a = await crearTenant('aislado-a');
    const b = await crearTenant('aislado-b');
    await a.proveedor('1', 'Luis Mora');
    await a.proveedor('2', 'Luis Inactivo', { activo: false });
    await b.proveedor('3', 'Luis Otro Tenant');
    const r = await a.service.buscar(a.tenant.id, { q: 'luis' });
    expect(r.map((x) => x.nombre)).toEqual(['Luis Mora']);
  });

  it('los comodines escritos se buscan literalmente', async () => {
    const t = await crearTenant('comodin');
    await t.proveedor('1', 'Ana Gil');
    await t.proveedor('2', 'Descuento 10% Test');
    expect(await t.service.buscar(t.tenant.id, { q: '%' })).toHaveLength(1);
    expect(await t.service.buscar(t.tenant.id, { q: '_' })).toHaveLength(0);
  });

  it('incluye el tipo de café de la última recepción para el valor por defecto', async () => {
    const t = await crearTenant('ultimo');
    const prov = await t.proveedor('1', 'Rosa Díaz');
    const punto = await prisma.puntoCompra.create({
      data: { tenantId: t.tenant.id, nombre: 'P' },
    });
    const base = {
      tenantId: t.tenant.id,
      puntoCompraId: punto.id,
      proveedorId: prov.id,
      pesoBruto: 10,
      pesoTara: 1,
      pesoNeto: 9,
      precioKg: 1000,
      valorTotal: 9000,
      createdById: t.user.id,
    };
    await prisma.recepcion.create({
      data: {
        ...base,
        codigo: `A-${run}`,
        tipoCafe: 'MOJADO',
        fecha: new Date('2026-01-01'),
      },
    });
    await prisma.recepcion.create({
      data: {
        ...base,
        codigo: `B-${run}`,
        tipoCafe: 'PASILLA',
        fecha: new Date('2026-02-01'),
      },
    });
    const [r] = await t.service.buscar(t.tenant.id, { q: 'rosa' });
    expect(r.ultimoTipoCafe).toBe('PASILLA');
  });

  it('RNF-01: con 5.000 proveedores responde por debajo de 300 ms', async () => {
    const t = await crearTenant('rendimiento');
    await prisma.proveedor.createMany({
      data: Array.from({ length: 5000 }, (_, i) => ({
        tenantId: t.tenant.id,
        tipoIdentificacion: 'CC' as const,
        numeroIdentificacion: String(10_000_000 + i),
        nombre: `Caficultor ${i} Apellido${i % 97}`,
        createdById: t.user.id,
      })),
    });
    await t.service.buscar(t.tenant.id, { q: 'warm' }); // calienta el plan
    const medidas: number[] = [];
    for (const q of ['caficultor 42', 'apellido7', '10004', 'caficulto 4999']) {
      const inicio = performance.now();
      await t.service.buscar(t.tenant.id, { q });
      medidas.push(performance.now() - inicio);
    }
    expect(Math.max(...medidas)).toBeLessThan(300);
  }, 60_000);
});
