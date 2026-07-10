import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { CompradoresController } from './compradores.controller';
import { CompradoresService } from './compradores.service';
import { ContratosVentaController } from './contratos-venta.controller';
import { ContratosVentaService } from './contratos-venta.service';
import { BodegaModule } from '../bodega/bodega.module';

@Module({
  imports: [BodegaModule],
  controllers: [VentasController, CompradoresController, ContratosVentaController],
  providers: [VentasService, CompradoresService, ContratosVentaService],
  exports: [VentasService, CompradoresService, ContratosVentaService],
})
export class VentasModule {}
