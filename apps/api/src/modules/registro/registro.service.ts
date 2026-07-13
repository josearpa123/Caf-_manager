import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EstadoTenant, Permission, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';

const ADMIN_ROLE_NAME = 'Administrador';

@Injectable()
export class RegistroService {
  constructor(private readonly prisma: PrismaService) {}

  // Catálogo de planes para la página pública: solo lo necesario para
  // mostrar precios/límites, sin exponer nada interno. Se ocultan los planes
  // sin módulos: son planes a medio armar y no se pueden asignar a nadie.
  listPlanes() {
    return this.prisma.plan.findMany({
      where: { modulos: { isEmpty: false } },
      select: {
        id: true,
        nombre: true,
        precioMensual: true,
        maxUsuarios: true,
        maxPuntosCompra: true,
        modulos: true,
      },
      orderBy: { maxUsuarios: 'asc' },
    });
  }

  // Autorregistro público: crea el Tenant en estado PENDIENTE (no puede
  // iniciar sesión hasta que un admin de plataforma lo apruebe desde
  // /platform, ver AuthService.assertTenantAccesible). Mismo patrón
  // transaccional que PlatformService.createTenant, pero sin guard y
  // forzando el estado — un registro público nunca puede activarse solo.
  async registrar(dto: RegistrarTenantDto) {
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      // Un plan sin módulos no se ofrece en la landing y tampoco se acepta si
      // llega por id: dejaría al tenant sin nada que usar (ver ModuloGuard).
      if (!plan || plan.modulos.length === 0) {
        throw new NotFoundException('El plan seleccionado no existe');
      }
    }

    const existente = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException('Ese correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    try {
      const { tenant } = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            nombre: dto.nombreTenant,
            nit: dto.nit,
            planId: dto.planId,
            telefono: dto.adminTelefono,
            estado: EstadoTenant.PENDIENTE,
          },
        });

        const role = await tx.role.create({
          data: { tenantId: tenant.id, nombre: ADMIN_ROLE_NAME, esSistema: true },
        });

        await tx.rolePermission.createMany({
          data: Object.values(Permission).map((permission) => ({
            tenantId: tenant.id,
            roleId: role.id,
            permission,
          })),
        });

        const admin = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: dto.adminEmail,
            nombre: dto.adminNombre,
            telefono: dto.adminTelefono,
            passwordHash,
          },
        });

        await tx.userRole.create({ data: { userId: admin.id, roleId: role.id } });

        return { tenant };
      });

      return {
        mensaje:
          'Tu cuenta fue creada y está pendiente de aprobación. Te avisaremos cuando esté activa.',
        tenantId: tenant.id,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ese correo ya está registrado');
      }
      throw error;
    }
  }
}
