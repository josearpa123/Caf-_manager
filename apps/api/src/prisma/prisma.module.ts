import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TENANT_PRISMA, tenantPrismaProvider } from './tenant-prisma.provider';

@Global()
@Module({
  providers: [PrismaService, tenantPrismaProvider],
  exports: [PrismaService, TENANT_PRISMA],
})
export class PrismaModule {}
