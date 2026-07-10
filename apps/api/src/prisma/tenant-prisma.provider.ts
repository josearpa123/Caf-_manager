import { Provider, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { tenantScopingExtension } from './extensions/tenant-scoping.extension';
import { auditLogExtension } from './extensions/audit-log.extension';
import { TenantJwtPayload } from '../common/types/auth.types';

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
// tenantId/userId directamente del JWT.
//
// IMPORTANTE: no se puede leer `request.user` aquí (poblado por
// JwtAuthGuard) porque NestJS resuelve el árbol de dependencias
// request-scoped (loadPerContext) ANTES de correr los guards — ver
// createRequestScopedHandler en @nestjs/core/router/router-explorer.js. Si
// este provider dependiera de un guard para poblar el request, siempre
// fallaría. Por eso verifica el token de forma independiente. JwtAuthGuard
// sigue corriendo igual (para @Public(), permisos y @CurrentUser() en los
// handlers), solo que después de esto.
export const tenantPrismaProvider: Provider = {
  provide: TENANT_PRISMA,
  scope: Scope.REQUEST,
  inject: [REQUEST, PrismaService, JwtService, ConfigService],
  useFactory: (
    request: Request,
    prisma: PrismaService,
    jwt: JwtService,
    config: ConfigService,
  ) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    if (!token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    let payload: TenantJwtPayload;
    try {
      payload = jwt.verify<TenantJwtPayload>(token, {
        secret: config.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Token de acceso inválido o expirado');
    }

    return buildTenantClient(prisma, payload.tenantId, payload.sub);
  },
};
