import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';

const ROLE_WITH_PERMISSIONS_INCLUDE = { permisos: true } as const;

@Injectable()
export class RolesService {
  constructor(@InjectTenantPrisma() private readonly prisma: TenantPrismaClient) {}

  findAll() {
    return this.prisma.role.findMany({
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async create(dto: CreateRoleDto) {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: { nombre: dto.nombre, descripcion: dto.descripcion },
      });
      if (dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((permission) => ({
            roleId: role.id,
            permission,
          })),
        });
      }
      return tx.role.findUniqueOrThrow({
        where: { id: role.id },
        include: ROLE_WITH_PERMISSIONS_INCLUDE,
      });
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (role.esSistema) {
      throw new BadRequestException(
        'El rol "Administrador" es fijo y no se puede editar',
      );
    }
    return this.prisma.role.update({
      where: { id },
      data: { nombre: dto.nombre, descripcion: dto.descripcion },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });
  }

  async setPermissions(id: string, dto: SetRolePermissionsDto) {
    const role = await this.findOne(id);
    if (role.esSistema) {
      throw new BadRequestException(
        'El rol "Administrador" es fijo y no se pueden cambiar sus permisos',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((permission) => ({
            roleId: id,
            permission,
          })),
        });
      }
      return tx.role.findUniqueOrThrow({
        where: { id },
        include: ROLE_WITH_PERMISSIONS_INCLUDE,
      });
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.esSistema) {
      throw new BadRequestException(
        'El rol "Administrador" es fijo y no se puede eliminar',
      );
    }
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
