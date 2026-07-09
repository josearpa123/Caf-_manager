import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

const USER_WITH_ROLES_INCLUDE = {
  roles: { include: { role: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(@InjectTenantPrisma() private readonly prisma: TenantPrismaClient) {}

  findAll() {
    return this.prisma.user.findMany({
      include: USER_WITH_ROLES_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_WITH_ROLES_INCLUDE,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  private async assertRolesBelongToTenant(roleIds: string[]) {
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    if (roles.length !== new Set(roleIds).size) {
      throw new BadRequestException(
        'Uno o más roles no existen en este tenant',
      );
    }
  }

  private async assertPuntoCompraBelongsToTenant(puntoCompraId: string) {
    const punto = await this.prisma.puntoCompra.findUnique({
      where: { id: puntoCompraId },
      select: { id: true },
    });
    if (!punto) {
      throw new BadRequestException(
        'El punto de compra no existe en este tenant',
      );
    }
  }

  async create(dto: CreateUserDto) {
    await this.assertRolesBelongToTenant(dto.roleIds);
    if (dto.puntoCompraId) {
      await this.assertPuntoCompraBelongsToTenant(dto.puntoCompraId);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          nombre: dto.nombre,
          telefono: dto.telefono,
          puntoCompraId: dto.puntoCompraId ?? null,
          passwordHash,
        },
      });

      await tx.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: USER_WITH_ROLES_INCLUDE,
      });
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.puntoCompraId) {
      await this.assertPuntoCompraBelongsToTenant(dto.puntoCompraId);
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        telefono: dto.telefono,
        puntoCompraId: dto.puntoCompraId,
        activo: dto.activo,
      },
      include: USER_WITH_ROLES_INCLUDE,
    });
  }

  async assignRoles(id: string, dto: AssignRolesDto) {
    await this.findOne(id);
    await this.assertRolesBelongToTenant(dto.roleIds);

    return this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
      return tx.user.findUniqueOrThrow({
        where: { id },
        include: USER_WITH_ROLES_INCLUDE,
      });
    });
  }
}
