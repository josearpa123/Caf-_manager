import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Modulo } from '@prisma/client';
import { MODULO_KEY } from '../decorators/require-modulo.decorator';
import { AuthenticatedUser, isAuthenticatedUser } from '../types/auth.types';

const NOMBRE_MODULO: Record<Modulo, string> = {
  PROVEEDORES: 'Proveedores',
  RECEPCION: 'Recepción y calidad',
  BODEGA: 'Bodega',
  VENTAS: 'Ventas',
  CORTES: 'Cortes y viajes',
  PAGOS: 'Pagos',
  PRESTAMOS: 'Préstamos',
  FACTURACION: 'Facturación electrónica',
  REPORTES: 'Reportes',
};

// Corta el acceso a lo que el tenant no compró. Es un eje distinto al de
// PermissionsGuard: aquí no importa qué puede hacer el usuario dentro del
// tenant, sino qué módulos incluye el plan que la plataforma le asignó.
@Injectable()
export class ModuloGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Modulo | undefined>(
      MODULO_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Ruta sin módulo asociado (auth, usuarios, configuración, plataforma…):
    // no es parte de lo que se vende por módulos.
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!isAuthenticatedUser(user)) {
      throw new ForbiddenException('No tienes acceso a este módulo');
    }

    // Tenant sin plan asignado: sin restricción de módulos, igual que no
    // tiene límite de usuarios ni de puntos de compra.
    if (user.modulos === null) return true;

    if (!user.modulos.includes(required)) {
      throw new ForbiddenException(
        `Tu plan no incluye el módulo de ${NOMBRE_MODULO[required]}. Contacta al administrador para habilitarlo.`,
      );
    }
    return true;
  }
}
