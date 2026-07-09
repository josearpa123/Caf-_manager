import { PrismaClient, CategoriaDefecto } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Catálogo estándar de defectos de café (norma Cenicafé/FNC).
// PRIMARIO: defecto grave, descuenta como grano completo.
// SECUNDARIO: defecto leve, varios equivalen a un defecto primario.
const DEFECTOS: {
  codigo: string;
  nombre: string;
  categoria: CategoriaDefecto;
  orden: number;
}[] = [
  { codigo: 'NEGRO', nombre: 'Negro', categoria: 'PRIMARIO', orden: 1 },
  { codigo: 'VINAGRE', nombre: 'Vinagre', categoria: 'PRIMARIO', orden: 2 },
  { codigo: 'FERMENTO', nombre: 'Fermento', categoria: 'PRIMARIO', orden: 3 },
  {
    codigo: 'CRISTALIZADO',
    nombre: 'Cristalizado',
    categoria: 'PRIMARIO',
    orden: 4,
  },
  {
    codigo: 'BROCA_GRAVE',
    nombre: 'Picado por broca (grave)',
    categoria: 'PRIMARIO',
    orden: 5,
  },
  {
    codigo: 'CONCHA_GRAVE',
    nombre: 'Concha (grave)',
    categoria: 'PRIMARIO',
    orden: 6,
  },
  {
    codigo: 'VANO_GRAVE',
    nombre: 'Vano / Flotador (grave)',
    categoria: 'PRIMARIO',
    orden: 7,
  },
  { codigo: 'PARTIDO', nombre: 'Partido', categoria: 'SECUNDARIO', orden: 8 },
  { codigo: 'MORDIDO', nombre: 'Mordido', categoria: 'SECUNDARIO', orden: 9 },
  { codigo: 'CORTADO', nombre: 'Cortado', categoria: 'SECUNDARIO', orden: 10 },
  {
    codigo: 'CONCHA_LEVE',
    nombre: 'Concha (leve)',
    categoria: 'SECUNDARIO',
    orden: 11,
  },
  {
    codigo: 'INMADURO',
    nombre: 'Inmaduro / Verde',
    categoria: 'SECUNDARIO',
    orden: 12,
  },
  {
    codigo: 'BROCA_LEVE',
    nombre: 'Brocado (leve)',
    categoria: 'SECUNDARIO',
    orden: 13,
  },
  {
    codigo: 'MANCHADO',
    nombre: 'Manchado',
    categoria: 'SECUNDARIO',
    orden: 14,
  },
  { codigo: 'CARACOL', nombre: 'Caracol', categoria: 'SECUNDARIO', orden: 15 },
  { codigo: 'AMBAR', nombre: 'Ámbar', categoria: 'SECUNDARIO', orden: 16 },
];

async function seedDefectos() {
  for (const defecto of DEFECTOS) {
    await prisma.defectoTipo.upsert({
      where: { codigo: defecto.codigo },
      update: {
        nombre: defecto.nombre,
        categoria: defecto.categoria,
        orden: defecto.orden,
      },
      create: defecto,
    });
  }
  console.log(`Seed: ${DEFECTOS.length} tipos de defecto listos.`);
}

// Crea el primer PlatformAdmin (super-admin) solo si se proveen credenciales
// por variables de entorno — nunca se hardcodean credenciales en el seed.
async function seedPlatformAdmin() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  const nombre = process.env.PLATFORM_ADMIN_NOMBRE ?? 'Administrador';

  if (!email || !password) {
    console.log(
      'Seed: PLATFORM_ADMIN_EMAIL/PLATFORM_ADMIN_PASSWORD no definidas, se omite la creación del super-admin.',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.platformAdmin.upsert({
    where: { email },
    update: { passwordHash, nombre },
    create: { email, passwordHash, nombre },
  });

  console.log(`Seed: PlatformAdmin listo (${email}).`);
}

async function main() {
  await seedDefectos();
  await seedPlatformAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
