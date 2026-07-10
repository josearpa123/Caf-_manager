import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { TENANT_PRISMA, tenantPrismaProvider } from './tenant-prisma.provider';

@Global()
@Module({
  imports: [
    // Registrado también acá (además de AuthModule) porque tenantPrismaProvider
    // necesita verificar el JWT por su cuenta, ver el comentario en
    // tenant-prisma.provider.ts.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
      }),
    }),
  ],
  providers: [PrismaService, tenantPrismaProvider],
  exports: [PrismaService, TENANT_PRISMA],
})
export class PrismaModule {}
