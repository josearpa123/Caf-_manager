import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { PlatformModule } from './modules/platform/platform.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { RecepcionModule } from './modules/recepcion/recepcion.module';
import { CalidadModule } from './modules/calidad/calidad.module';
import { BodegaModule } from './modules/bodega/bodega.module';
import { VentasModule } from './modules/ventas/ventas.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { FacturacionModule } from './modules/facturacion/facturacion.module';
import { ReportesModule } from './modules/reportes/reportes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    AuditModule,
    PlatformModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    ProveedoresModule,
    RecepcionModule,
    CalidadModule,
    BodegaModule,
    VentasModule,
    PagosModule,
    FacturacionModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Orden importa: JwtAuthGuard debe correr antes que PermissionsGuard
    // para poblar request.user (del que PermissionsGuard depende).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
