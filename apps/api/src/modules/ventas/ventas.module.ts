import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { CompradoresController } from './compradores.controller';
import { CompradoresService } from './compradores.service';
import { BodegaModule } from '../bodega/bodega.module';

@Module({
  imports: [BodegaModule],
  controllers: [VentasController, CompradoresController],
  providers: [VentasService, CompradoresService],
  exports: [VentasService, CompradoresService],
})
export class VentasModule {}
