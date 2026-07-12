import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Permission } from '@prisma/client';
import { ViajesService } from './viajes.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateViajeDto } from './dto/create-viaje.dto';
import { UpdateViajeDto } from './dto/update-viaje.dto';
import { QueryViajesDto } from './dto/query-viajes.dto';
import { AsignarVentasDto } from './dto/asignar-ventas.dto';

// Un "corte de entrega" / viaje agrupa varias ventas de un mismo despacho.
// Reutiliza los permisos de VENTAS (es parte del flujo de despacho/venta).
@Controller('viajes')
export class ViajesController {
  constructor(private readonly viajesService: ViajesService) {}

  @RequirePermissions(Permission.VENTAS_VER)
  @Get()
  findAll(@Query() query: QueryViajesDto) {
    return this.viajesService.findAll(query);
  }

  // Ventas del tenant todavía sin corte asignado (para armar un viaje).
  @RequirePermissions(Permission.VENTAS_VER)
  @Get('ventas-sin-asignar')
  ventasSinAsignar(
    @Query('puntoCompraId') puntoCompraId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.viajesService.ventasSinAsignar({ puntoCompraId, desde, hasta });
  }

  @RequirePermissions(Permission.VENTAS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.viajesService.findOne(id);
  }

  @RequirePermissions(Permission.VENTAS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateViajeDto,
  ) {
    return this.viajesService.create(tenantId, userId, dto);
  }

  @RequirePermissions(Permission.VENTAS_EDITAR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateViajeDto) {
    return this.viajesService.update(id, dto);
  }

  @RequirePermissions(Permission.VENTAS_EDITAR)
  @Post(':id/ventas')
  asignarVentas(@Param('id') id: string, @Body() dto: AsignarVentasDto) {
    return this.viajesService.asignarVentas(id, dto.ventaIds);
  }

  @RequirePermissions(Permission.VENTAS_EDITAR)
  @Delete(':id/ventas/:ventaId')
  quitarVenta(@Param('id') id: string, @Param('ventaId') ventaId: string) {
    return this.viajesService.quitarVenta(id, ventaId);
  }

  @RequirePermissions(Permission.VENTAS_ELIMINAR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.viajesService.remove(id);
  }
}
