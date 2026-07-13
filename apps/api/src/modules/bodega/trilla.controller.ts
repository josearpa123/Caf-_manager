import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { TrillaService } from './trilla.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTrillaDto } from './dto/create-trilla.dto';
import { QueryPuntoCompraDto } from './dto/query-punto-compra.dto';

@Controller('bodega/trilla')
@RequireModulo(Modulo.BODEGA)
export class TrillaController {
  constructor(private readonly trillaService: TrillaService) {}

  @RequirePermissions(Permission.BODEGA_VER)
  @Get()
  findAll(@Query() query: QueryPuntoCompraDto) {
    return this.trillaService.findAll(query);
  }

  @RequirePermissions(Permission.BODEGA_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trillaService.findOne(id);
  }

  @RequirePermissions(Permission.BODEGA_TRILLA_GESTIONAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTrillaDto,
  ) {
    return this.trillaService.create(tenantId, userId, dto);
  }
}
