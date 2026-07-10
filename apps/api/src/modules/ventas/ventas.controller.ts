import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { VentasService } from './ventas.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateVentaDto } from './dto/create-venta.dto';
import { QueryVentasDto } from './dto/query-ventas.dto';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @RequirePermissions(Permission.VENTAS_VER)
  @Get()
  findAll(@Query() query: QueryVentasDto) {
    return this.ventasService.findAll(query);
  }

  @RequirePermissions(Permission.VENTAS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ventasService.findOne(id);
  }

  @RequirePermissions(Permission.VENTAS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVentaDto,
  ) {
    return this.ventasService.create(tenantId, userId, dto);
  }
}
