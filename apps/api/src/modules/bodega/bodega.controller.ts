import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { BodegaService } from './bodega.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QueryPuntoCompraDto } from './dto/query-punto-compra.dto';
import { DecidirDestinoPasillaDto } from './dto/decidir-destino-pasilla.dto';

@Controller('bodega')
export class BodegaController {
  constructor(private readonly bodegaService: BodegaService) {}

  @RequirePermissions(Permission.BODEGA_VER)
  @Get('inventario')
  getInventario(@Query() query: QueryPuntoCompraDto) {
    return this.bodegaService.getInventario(query);
  }

  @RequirePermissions(Permission.BODEGA_AJUSTES_GESTIONAR)
  @Patch('pasilla/:recepcionId/destino')
  decidirDestinoPasilla(
    @CurrentUser('userId') userId: string,
    @Param('recepcionId') recepcionId: string,
    @Body() dto: DecidirDestinoPasillaDto,
  ) {
    return this.bodegaService.decidirDestinoPasilla(userId, recepcionId, dto);
  }
}
