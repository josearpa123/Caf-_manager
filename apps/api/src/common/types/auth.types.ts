import { Permission } from '@prisma/client';

export interface TenantJwtPayload {
  sub: string; // User.id
  tenantId: string;
  roles: string[]; // nombres de Role, solo informativo
  permissions: Permission[];
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
