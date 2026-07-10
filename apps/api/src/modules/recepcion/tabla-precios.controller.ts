import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { TablaPreciosService } from './tabla-precios.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTablaPrecioTramoDto } from './dto/create-tabla-precio-tramo.dto';
import { QueryTablaPreciosDto } from './dto/query-tabla-precios.dto';

@Controller('tabla-precios')
export class TablaPreciosController {
  constructor(private readonly tablaPreciosService: TablaPreciosService) {}

  @RequirePermissions(Permission.PRECIOS_VER)
  @Get()
  findVigentes(@Query() query: QueryTablaPreciosDto) {
    return this.tablaPreciosService.findVigentes(query);
  }

  @RequirePermissions(Permission.PRECIOS_EDITAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTablaPrecioTramoDto,
  ) {
    return this.tablaPreciosService.create(tenantId, userId, dto);
  }
}
