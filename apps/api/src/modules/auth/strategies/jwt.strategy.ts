import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  TenantJwtPayload,
} from '../../../common/types/auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  validate(payload: TenantJwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
      // Tokens emitidos antes de que existieran los planes por módulo no
      // traen el campo: se tratan como "sin restricción", igual que un
      // tenant sin plan, en vez de dejar al usuario sin ningún módulo.
      modulos: payload.modulos ?? null,
      puntoCompraId: payload.puntoCompraId,
    };
  }
}
