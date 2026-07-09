import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from '../types/auth.types';

// Uso: @CurrentUser() user: AuthenticatedUser
// o:   @CurrentUser('puntoCompraId') puntoCompraId: string | null
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
