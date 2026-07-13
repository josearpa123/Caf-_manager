import { SetMetadata } from '@nestjs/common';
import { Modulo } from '@prisma/client';

export const MODULO_KEY = 'modulo';

// Marca un controller (o un handler suelto) como parte de un módulo
// comercializable: solo los tenants cuyo plan lo incluya pueden usarlo.
// Ver ModuloGuard.
export const RequireModulo = (modulo: Modulo) => SetMetadata(MODULO_KEY, modulo);
