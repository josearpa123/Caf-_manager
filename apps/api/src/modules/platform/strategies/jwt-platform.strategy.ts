import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedPlatformAdmin,
  PlatformJwtPayload,
} from '../../../common/types/auth.types';

@Injectable()
export class JwtPlatformStrategy extends PassportStrategy(
  Strategy,
  'jwt-platform',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.platformSecret')!,
    });
  }

  validate(payload: PlatformJwtPayload): AuthenticatedPlatformAdmin {
    if (!payload.isPlatformAdmin) {
      throw new UnauthorizedException();
    }
    return { platformAdminId: payload.sub, isPlatformAdmin: true };
  }
}
