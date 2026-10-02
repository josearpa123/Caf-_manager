import {
  PrismaClient,
  TipoCafeRecepcion,
  TipoConsecutivo,
} from '@prisma/client';
import { siguienteConsecutivo } from '../src/prisma/consecutivo';
import { auditLogExtension } from '../src/prisma/extensions/audit-log.extension';
import { tenantScopingExtension } from '../src/prisma/extensions/tenant-scoping.extension';
import { RecepcionService } from '../src/modules/recepcion/recepcion.service';

// Requiere PostgreSQL real con las migraciones aplicadas (DATABASE_URL).
// Cada corrida crea sus propios tenants con sufijo único y no toca datos ajenos.
const prisma = new PrismaClient({
  // 100 transacciones simultáneas del mismo tenant se serializan en la fila del
  // contador; la prueba necesita holgura de pool, no es un límite del sistema.
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
  return { tenant, user, punto, proveedor };
}

const siguiente = (
  tenantId: string,
  tipo: TipoConsecutivo,
  fecha = new Date('2026-06-15T12:00:00Z'),
) =>
  prisma.$transaction((tx) => siguienteConsecutivo(tx, tenantId, tipo, fecha));

describe('siguienteConsecutivo (PostgreSQL real)', () => {
  afterAll(() => prisma.$disconnect());

  it('arranca en 1 y avanza de a uno con formato PREFIJO-AÑO-NNNNNN', async () => {
    const { tenant } = await crearTenant('formato');
    expect(await siguiente(tenant.id, 'RECEPCION')).toBe('REC-2026-000001');
    expect(await siguiente(tenant.id, 'RECEPCION')).toBe('REC-2026-000002');
  });

  it.each([
    ['RECEPCION', 'REC'],
    ['SECADO', 'SEC'],
    ['TRILLA', 'TRI'],
    ['PRESTAMO', 'PRE'],
    ['VENTA', 'VTA'],
    ['CONTRATO_VENTA', 'CTR'],
    ['VIAJE', 'CORTE'],
  ] as const)('prefijo de %s es %s', async (tipo, prefijo) => {
    const { tenant } = await crearTenant(`pref-${tipo}`);
    expect(await siguiente(tenant.id, tipo)).toBe(`${prefijo}-2026-000001`);
  });

  it('los contadores son independientes por tipo, año y tenant', async () => {
    const a = await crearTenant('indep-a');
    const b = await crearTenant('indep-b');
    await siguiente(a.tenant.id, 'RECEPCION');
    await siguiente(a.tenant.id, 'RECEPCION');
    expect(await siguiente(a.tenant.id, 'VENTA')).toBe('VTA-2026-000001');
    expect(
      await siguiente(a.tenant.id, 'RECEPCION', new Date('2025-03-01T12:00Z')),
    ).toBe('REC-2025-000001');
    expect(await siguiente(b.tenant.id, 'RECEPCION')).toBe('REC-2026-000001');
    // volver al año anterior no reinicia ni repite el del año actual
    expect(await siguiente(a.tenant.id, 'RECEPCION')).toBe('REC-2026-000003');
  });

  it('el año es el de Colombia: 31-dic a las 8 p. m. hora Bogotá sigue siendo ese año', async () => {
    const { tenant } = await crearTenant('anio-colombia');
    // 2027-01-01T03:00Z = 31-dic-2026 10 p. m. en Bogotá
    expect(
      await siguiente(tenant.id, 'RECEPCION', new Date('2027-01-01T03:00:00Z')),
    ).toBe('REC-2026-000001');
    // 2027-01-01T05:00Z = 1-ene-2027 12 a. m. en Bogotá
    expect(
      await siguiente(tenant.id, 'RECEPCION', new Date('2027-01-01T05:00:00Z')),
    ).toBe('REC-2027-000001');
  });

  it('dentro de una transacción que luego falla deja hueco, no repite', async () => {
    const { tenant } = await crearTenant('rollback');
    await expect(
      prisma.$transaction(async (tx) => {
        await siguienteConsecutivo(
          tx,
          tenant.id,
          'RECEPCION',
          new Date('2026-06-15T12:00:00Z'),
        );
        throw new Error('falla de negocio');
      }),
    ).rejects.toThrow('falla de negocio');
    // la transacción revirtió su incremento; lo importante es no repetir nunca
    const codigos = [
      await siguiente(tenant.id, 'RECEPCION'),
      await siguiente(tenant.id, 'RECEPCION'),
    ];
    expect(new Set(codigos).size).toBe(2);
  });

  it('100 llamadas concurrentes del mismo tenant no repiten ni saltan números', async () => {
    const { tenant } = await crearTenant('concurrente');
    const codigos = await Promise.all(
      Array.from({ length: 100 }, () => siguiente(tenant.id, 'VENTA')),
    );
    expect(new Set(codigos).size).toBe(100);
    const numeros = codigos
      .map((c) => Number(c.slice(-6)))
      .sort((x, y) => x - y);
    expect(numeros[0]).toBe(1);
    expect(numeros[99]).toBe(100);
  }, 60_000);

  it('respeta la siembra de la migración (continúa tras el máximo existente)', async () => {
    const { tenant } = await crearTenant('siembra');
    await prisma.consecutivo.create({
      data: {
        tenantId: tenant.id,
        tipo: 'PRESTAMO',
        anio: 2026,
        prefijo: 'PRE',
        valorActual: 41,
      },
    });
    expect(await siguiente(tenant.id, 'PRESTAMO')).toBe('PRE-2026-000042');
  });
});

describe('RecepcionService con 100 recepciones concurrentes (H1)', () => {
  afterAll(() => prisma.$disconnect());

  it('genera 100 códigos únicos sin errores', async () => {
    const { tenant, user, punto, proveedor } = await crearTenant('rec100');
    const scoped = prisma
      .$extends(tenantScopingExtension(tenant.id))
      .$extends(auditLogExtension(tenant.id, user.id));
    // TablaPreciosService no se usa: MOJADO va con precio directo.
    const service = new RecepcionService(scoped, {} as never);

    // 100 recepciones con 10 en vuelo a la vez (pool de 20). Más en vuelo que
    // la mitad del pool agota las conexiones por un problema ajeno a los
    // consecutivos: la auditoría pide una segunda conexión mientras la
    // transacción mantiene la suya (ver PROGRESO.md).
    const crear = () =>
      service.create(tenant.id, user.id, {
        puntoCompraId: punto.id,
        proveedorId: proveedor.id,
        tipoCafe: TipoCafeRecepcion.MOJADO,
        pesoBruto: 50,
        pesoTara: 1,
        precioKg: 4000,
      });
    const resultados: PromiseSettledResult<{ codigo: string }>[] = [];
    let pendientes = 100;
    await Promise.all(
      Array.from({ length: 10 }, async () => {
        while (pendientes-- > 0) {
          const [r] = await Promise.allSettled([crear()]);
          resultados.push(r);
        }
      }),
    );

    const fallos = resultados.filter((r) => r.status === 'rejected');
    expect(fallos).toHaveLength(0);
    const codigos = resultados.map((r) =>
      r.status === 'fulfilled' ? r.value.codigo : '',
    );
    expect(new Set(codigos).size).toBe(100);
    expect(
      await prisma.recepcion.count({ where: { tenantId: tenant.id } }),
    ).toBe(100);
    const inventario = await prisma.movimientoInventario.count({
      where: { tenantId: tenant.id },
    });
    expect(inventario).toBe(100);
  }, 120_000);
});
