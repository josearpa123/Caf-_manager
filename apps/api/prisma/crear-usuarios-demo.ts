/**
 * Script puntual: crea/actualiza dos accesos de demo con el mismo correo
 *   - PlatformAdmin  -> dashboard de plataforma (/platform/login)
 *   - User (tenant)  -> dashboard de la app     (/login)
 *
 * Uso:  EMAIL=... PASSWORD=... ts-node prisma/crear-usuarios-demo.ts
 */
import { PrismaClient, EstadoTenant } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMAIL = process.env.DEMO_EMAIL ?? 'joseariaspantoj@gmail.com';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'CoffeeAdmin2026!';
const NOMBRE = process.env.DEMO_NOMBRE ?? 'Jose Arias';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 1) PlatformAdmin (dashboard de plataforma) --------------------------------
  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { email: EMAIL },
    update: { passwordHash, nombre: NOMBRE },
    create: { email: EMAIL, passwordHash, nombre: NOMBRE },
  });
  console.log(`✔ PlatformAdmin listo: ${platformAdmin.email}`);

  // 2) User de tenant (dashboard de la app) -----------------------------------
  // Se necesita un tenant ACTIVO y un rol con permisos. Usamos uno existente
  // (o creamos uno) y asignamos el rol Administrador de ese tenant.
  let tenant = await prisma.tenant.findFirst({
    where: { estado: EstadoTenant.ACTIVO },
    orderBy: { createdAt: 'asc' },
  });

  if (!tenant) {
    throw new Error(
      'No hay ningún tenant ACTIVO. Aprueba uno desde /platform o crea uno antes.',
    );
  }

  // Rol Administrador del tenant (el flujo de registro le da TODOS los permisos)
  const rolAdmin = await prisma.role.findFirst({
    where: { tenantId: tenant.id, nombre: 'Administrador' },
  });
  if (!rolAdmin) {
    throw new Error(
      `El tenant ${tenant.nombre} no tiene rol Administrador; revisa los datos.`,
    );
  }

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, nombre: NOMBRE, tenantId: tenant.id, activo: true },
    create: {
      email: EMAIL,
      nombre: NOMBRE,
      passwordHash,
      tenantId: tenant.id,
      activo: true,
    },
  });

  // Garantizar la asignación del rol Administrador (idempotente)
  const yaTiene = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: rolAdmin.id },
  });
  if (!yaTiene) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: rolAdmin.id },
    });
  }

  console.log(`✔ User de tenant listo: ${user.email}  (tenant: ${tenant.nombre})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
