/**
 * Script puntual de VERIFICACIÓN: inserta ventas de demo directamente (saltando
 * las validaciones de inventario del servicio) para poder probar los cortes y
 * el reporte por cortes. Idempotente por código.
 */
import { PrismaClient, TipoInventario } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({
    where: { estado: 'ACTIVO' },
    orderBy: { createdAt: 'asc' },
  });
  if (!tenant) throw new Error('No hay tenant ACTIVO');
  const punto = await prisma.puntoCompra.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!punto) throw new Error('El tenant no tiene punto de compra');
  const user = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!user) throw new Error('El tenant no tiene usuarios');

  const ventas = [
    { fecha: '2026-05-10', comprador: 'Trilladora El Roble', kg: 500, precio: 15500, tipo: TipoInventario.PERGAMINO },
    { fecha: '2026-06-14', comprador: 'Trilladora El Roble', kg: 320, precio: 15800, tipo: TipoInventario.PERGAMINO },
    { fecha: '2026-06-28', comprador: 'Café Andino SAS', kg: 210, precio: 16000, tipo: TipoInventario.ALMENDRA },
    { fecha: '2026-07-03', comprador: 'Trilladora El Roble', kg: 640, precio: 16200, tipo: TipoInventario.PERGAMINO },
    { fecha: '2026-07-06', comprador: 'Café Andino SAS', kg: 180, precio: 16300, tipo: TipoInventario.ALMENDRA },
    { fecha: '2026-07-09', comprador: 'Exportadora Sur', kg: 420, precio: 16100, tipo: TipoInventario.PERGAMINO },
  ];

  const year = 2026;
  const prefix = `VTA-${year}-`;
  let count = await prisma.venta.count({ where: { codigo: { startsWith: prefix } } });

  for (const v of ventas) {
    const codigo = `${prefix}${String(++count).padStart(6, '0')}`;
    const valorTotal = Math.round(v.kg * v.precio * 100) / 100;
    await prisma.venta.create({
      data: {
        tenantId: tenant.id,
        puntoCompraId: punto.id,
        codigo,
        fecha: new Date(`${v.fecha}T12:00:00.000Z`),
        tipoCafe: v.tipo,
        compradorNombre: v.comprador,
        cantidadKg: v.kg,
        precioKg: v.precio,
        valorTotal,
        createdById: user.id,
      },
    });
    console.log(`✔ ${codigo}  ${v.fecha}  ${v.comprador}  ${v.kg}kg`);
  }
  console.log(`Listo: ${ventas.length} ventas de demo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
