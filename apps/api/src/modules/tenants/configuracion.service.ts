import { Injectable } from '@nestjs/common';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { UpsertConfiguracionDto } from './dto/upsert-configuracion.dto';

@Injectable()
export class ConfiguracionService {
  constructor(@InjectTenantPrisma() private readonly prisma: TenantPrismaClient) {}

  async get(tenantId: string) {
    return this.prisma.configuracionTenant.findUnique({
      where: { tenantId },
    });
  }

  async upsert(tenantId: string, dto: UpsertConfiguracionDto) {
    return this.prisma.configuracionTenant.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: dto,
    });
  }
}
