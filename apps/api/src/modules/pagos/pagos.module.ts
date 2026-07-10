import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { AnticiposController } from './anticipos.controller';
import { AnticiposService } from './anticipos.service';
import { ConciliacionesController } from './conciliaciones.controller';
import { ConciliacionesService } from './conciliaciones.service';

@Module({
  controllers: [PagosController, AnticiposController, ConciliacionesController],
  providers: [PagosService, AnticiposService, ConciliacionesService],
  exports: [PagosService, AnticiposService, ConciliacionesService],
})
export class PagosModule {}
