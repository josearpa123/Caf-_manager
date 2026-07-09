import { Module } from '@nestjs/common';
import { RecepcionController } from './recepcion.controller';
import { RecepcionService } from './recepcion.service';

@Module({
  controllers: [RecepcionController],
  providers: [RecepcionService],
  exports: [RecepcionService],
})
export class RecepcionModule {}
