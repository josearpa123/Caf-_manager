import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { ConfiguracionController } from './configuracion.controller';
import { ConfiguracionService } from './configuracion.service';
import { PuntosCompraController } from './puntos-compra.controller';
import { PuntosCompraService } from './puntos-compra.service';

@Module({
  controllers: [
    TenantsController,
    ConfiguracionController,
    PuntosCompraController,
  ],
  providers: [TenantsService, ConfiguracionService, PuntosCompraService],
  exports: [TenantsService, ConfiguracionService, PuntosCompraService],
})
export class TenantsModule {}
