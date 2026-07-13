import { Modulo, Permission } from '@prisma/client';

export interface TenantJwtPayload {
  sub: string; // User.id
  tenantId: string;
  roles: string[]; // nombres de Role, solo informativo
  permissions: Permission[];
  // Módulos del plan del tenant. null = tenant sin plan asignado, que no
  // tiene restricción de módulos (ver ModuloGuard). Se recalculan en cada
  // login y refresh, igual que permissions: un cambio de plan se hace
  // efectivo cuando el access token se renueva, no al instante.
  modulos: Modulo[] | null;
  puntoCompraId: string | null;
}

export interface PlatformJwtPayload {
  sub: string; // PlatformAdmin.id
  isPlatformAdmin: true;
}

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: Permission[];
  modulos: Modulo[] | null;
  puntoCompraId: string | null;
}

export interface AuthenticatedPlatformAdmin {
  platformAdminId: string;
  isPlatformAdmin: true;
}

export function isAuthenticatedUser(
  user: AuthenticatedUser | AuthenticatedPlatformAdmin | undefined,
): user is AuthenticatedUser {
  return !!user && 'tenantId' in user;
}
