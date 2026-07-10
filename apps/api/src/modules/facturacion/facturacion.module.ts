import { Module } from '@nestjs/common';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';
import { FacturacionProviderFactory } from './adapters/facturacion-provider.factory';
import { NingunoFacturacionProvider } from './adapters/ninguno.provider';

@Module({
  controllers: [FacturacionController],
  providers: [FacturacionService, FacturacionProviderFactory, NingunoFacturacionProvider],
  exports: [FacturacionService],
})
export class FacturacionModule {}
