import { Provider, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { tenantScopingExtension } from './extensions/tenant-scoping.extension';
import { auditLogExtension } from './extensions/audit-log.extension';
import { isAuthenticatedUser } from '../common/types/auth.types';

export const TENANT_PRISMA = Symbol('TENANT_PRISMA');

function buildTenantClient(
  prisma: PrismaService,
  tenantId: string,
  userId: string,
) {
  return prisma
    .$extends(tenantScopingExtension(tenantId))
    .$extends(auditLogExtension(tenantId, userId));
}

export type TenantPrismaClient = ReturnType<typeof buildTenantClient>;

// Provider request-scoped: se reconstruye una vez por request, leyendo el
// tenantId/userId del usuario autenticado (poblado por JwtAuthGuard). Todo
// servicio de un módulo tenant-scoped debe inyectar esto (@InjectTenantPrisma())
// en vez de PrismaService directo.
export const tenantPrismaProvider: Provider = {
  provide: TENANT_PRISMA,
  scope: Scope.REQUEST,
  inject: [REQUEST, PrismaService],
  useFactory: (request: Request, prisma: PrismaService) => {
    const user = request.user;
    if (!isAuthenticatedUser(user)) {
      throw new Error(
        'TENANT_PRISMA solicitado fuera de un contexto de request autenticado de tenant',
      );
    }
    return buildTenantClient(prisma, user.tenantId, user.userId);
  },
};
