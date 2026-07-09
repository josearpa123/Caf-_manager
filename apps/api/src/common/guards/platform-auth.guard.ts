import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Se aplica explícitamente con @UseGuards(PlatformAuthGuard) solo en rutas de
// /platform — no es un guard global, a diferencia de JwtAuthGuard.
@Injectable()
export class PlatformAuthGuard extends AuthGuard('jwt-platform') {}
