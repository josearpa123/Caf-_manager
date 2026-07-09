import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { JwtPlatformStrategy } from './strategies/jwt-platform.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.platformSecret'),
        signOptions: { expiresIn: config.get<string>('jwt.accessExpiresIn') },
      }),
    }),
  ],
  controllers: [PlatformController],
  providers: [PlatformService, JwtPlatformStrategy],
  exports: [PlatformService],
})
export class PlatformModule {}
