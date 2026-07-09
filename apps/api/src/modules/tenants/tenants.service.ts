import { Injectable } from '@nestjs/common';
import { InjectTenantPrisma } from '../../prisma/inject-tenant-prisma.decorator';
import { TenantPrismaClient } from '../../prisma/tenant-prisma.provider';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(@InjectTenantPrisma() private readonly prisma: TenantPrismaClient) {}

  getMine(tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  }

  update(tenantId: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data: dto });
  }
}
