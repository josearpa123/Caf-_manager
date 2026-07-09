import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Permission } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthenticatedUser, isAuthenticatedUser } from '../types/auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!isAuthenticatedUser(user)) {
      throw new ForbiddenException('No tienes permisos suficientes para esta acción');
    }

    const granted = new Set(user.permissions);
    const ok = required.every((permission) => granted.has(permission));
    if (!ok) {
      throw new ForbiddenException('No tienes permisos suficientes para esta acción');
    }
    return true;
  }
}
