import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { EstadoTenant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantJwtPayload } from '../../common/types/auth.types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const REFRESH_TOKEN_BYTES = 40;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async loadUserWithPermissions(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permisos: true } } } },
        tenant: { select: { estado: true } },
      },
    });
  }

  private computePermissions(
    user: Awaited<ReturnType<AuthService['loadUserWithPermissions']>>,
  ) {
    const permissions = new Set(
      user.roles.flatMap((ur) => ur.role.permisos.map((p) => p.permission)),
    );
    const roleNames = user.roles.map((ur) => ur.role.nombre);
    return { permissions: [...permissions], roleNames };
  }

  private signAccessToken(payload: TenantJwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });
  }

  private async issueRefreshToken(userId: string) {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshExpiresInDays = this.config.get<number>(
      'jwt.refreshExpiresInDays',
    )!;
    const expiresAt = new Date(
      Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
    return token;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: { include: { role: { include: { permisos: true } } } },
        tenant: { select: { estado: true } },
      },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.tenant.estado === EstadoTenant.SUSPENDIDO) {
      throw new UnauthorizedException(
        'Esta cuenta está suspendida. Contacte al administrador.',
      );
    }

    const { permissions, roleNames } = this.computePermissions(user);

    const accessToken = this.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      roles: roleNames,
      permissions,
      puntoCompraId: user.puntoCompraId,
    });
    const refreshToken = await this.issueRefreshToken(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        tenantId: user.tenantId,
        roles: roleNames,
        permissions,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = hashToken(dto.refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.loadUserWithPermissions(existing.userId);
    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    if (user.tenant.estado === EstadoTenant.SUSPENDIDO) {
      throw new UnauthorizedException(
        'Esta cuenta está suspendida. Contacte al administrador.',
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const { permissions, roleNames } = this.computePermissions(user);
    const accessToken = this.signAccessToken({
      sub: user.id,
      tenantId: user.tenantId,
      roles: roleNames,
      permissions,
      puntoCompraId: user.puntoCompraId,
    });
    const refreshToken = await this.issueRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async logout(dto: RefreshTokenDto) {
    const tokenHash = hashToken(dto.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
