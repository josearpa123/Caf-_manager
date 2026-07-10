import { Module } from '@nestjs/common';
import { RecepcionController } from './recepcion.controller';
import { RecepcionService } from './recepcion.service';
import { TablaPreciosController } from './tabla-precios.controller';
import { TablaPreciosService } from './tabla-precios.service';

@Module({
  controllers: [RecepcionController, TablaPreciosController],
  providers: [RecepcionService, TablaPreciosService],
  exports: [RecepcionService, TablaPreciosService],
})
export class RecepcionModule {}
