import { Module } from '@nestjs/common';
import { BodegaController } from './bodega.controller';
import { BodegaService } from './bodega.service';
import { SecadoController } from './secado.controller';
import { SecadoService } from './secado.service';
import { TrillaController } from './trilla.controller';
import { TrillaService } from './trilla.service';

@Module({
  controllers: [BodegaController, SecadoController, TrillaController],
  providers: [BodegaService, SecadoService, TrillaService],
  exports: [BodegaService, SecadoService, TrillaService],
})
export class BodegaModule {}
