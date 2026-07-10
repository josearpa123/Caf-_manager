import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedoresDto } from './dto/query-proveedores.dto';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll(query: QueryProveedoresDto) {
    const where: Prisma.ProveedorWhereInput = {};
    if (query.activo !== undefined) where.activo = query.activo;
    if (query.municipio) where.municipio = query.municipio;
    if (query.q) {
      where.OR = [
        { nombre: { contains: query.q, mode: 'insensitive' } },
        { numeroIdentificacion: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.proveedor.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async create(tenantId: string, createdById: string, dto: CreateProveedorDto) {
    try {
      return await this.prisma.proveedor.create({
        data: { tenantId, createdById, ...dto },
      });
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async update(id: string, dto: UpdateProveedorDto) {
    await this.findOne(id);
    try {
      return await this.prisma.proveedor.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async setActivo(id: string, activo: boolean) {
    await this.findOne(id);
    return this.prisma.proveedor.update({ where: { id }, data: { activo } });
  }

  private translateUniqueConstraintError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        'Ya existe un proveedor con ese tipo y número de identificación',
      );
    }
    return error;
  }
}
