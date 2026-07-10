import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import type { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { CreateCompradorDto } from './dto/create-comprador.dto';
import { UpdateCompradorDto } from './dto/update-comprador.dto';

@Injectable()
export class CompradoresService {
  constructor(
    @InjectTenantPrisma() private readonly prisma: TenantPrismaClient,
  ) {}

  findAll() {
    return this.prisma.comprador.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findOne(id: string) {
    const comprador = await this.prisma.comprador.findUnique({
      where: { id },
    });
    if (!comprador) throw new NotFoundException('Comprador no encontrado');
    return comprador;
  }

  create(tenantId: string, dto: CreateCompradorDto) {
    return this.prisma.comprador.create({ data: { tenantId, ...dto } });
  }

  async update(id: string, dto: UpdateCompradorDto) {
    await this.findOne(id);
    return this.prisma.comprador.update({ where: { id }, data: dto });
  }
}
