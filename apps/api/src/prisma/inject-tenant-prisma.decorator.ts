import { Inject } from '@nestjs/common';
import { TENANT_PRISMA } from './tenant-prisma.provider';

export const InjectTenantPrisma = () => Inject(TENANT_PRISMA);
