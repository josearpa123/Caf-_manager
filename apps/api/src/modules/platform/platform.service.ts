import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Permission } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformJwtPayload } from '../../common/types/auth.types';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateTenantPlatformDto } from './dto/update-tenant-platform.dto';

const ADMIN_ROLE_NAME = 'Administrador';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: PlatformLoginDto) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email: dto.email },
    });

    if (!admin || !admin.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: PlatformJwtPayload = {
      sub: admin.id,
      isPlatformAdmin: true,
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.platformSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      admin: { id: admin.id, email: admin.email, nombre: admin.nombre },
    };
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        nombre: true,
        nit: true,
        estado: true,
        createdAt: true,
        plan: true,
        _count: { select: { users: true, puntosCompra: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTenant(id: string, dto: UpdateTenantPlatformDto) {
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });
      if (!plan) throw new BadRequestException('El plan indicado no existe');
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    return this.prisma.tenant.update({
      where: { id },
      data: { planId: dto.planId, estado: dto.estado },
      include: { plan: true },
    });
  }

  listPlanes() {
    return this.prisma.plan.findMany({ orderBy: { createdAt: 'asc' } });
  }

  createPlan(dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: dto });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  // Transaccional: crea el Tenant + su rol "Administrador" (con TODOS los
  // permisos) + el primer usuario admin, en una sola operación. Usa
  // PrismaService base (sin tenant-scoping) porque literalmente está creando
  // el tenant.
  async createTenant(dto: CreateTenantDto) {
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });
      if (!plan) throw new BadRequestException('El plan indicado no existe');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    const { tenant, admin } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { nombre: dto.nombreTenant, nit: dto.nit, planId: dto.planId },
      });

      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          nombre: ADMIN_ROLE_NAME,
          esSistema: true,
        },
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
          passwordHash,
        },
      });

      await tx.userRole.create({
        data: { userId: admin.id, roleId: role.id },
      });

      return { tenant, admin };
    });

    return {
      tenant,
      admin: { id: admin.id, email: admin.email, nombre: admin.nombre },
    };
  }
}
