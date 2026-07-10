import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { FacturacionService } from './facturacion.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { QueryFacturasDto } from './dto/query-facturas.dto';
import { AnularFacturaDto } from './dto/anular-factura.dto';

@Controller('facturacion')
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @RequirePermissions(Permission.FACTURACION_VER)
  @Get()
  findAll(@Query() query: QueryFacturasDto) {
    return this.facturacionService.findAll(query);
  }

  @RequirePermissions(Permission.FACTURACION_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facturacionService.findOne(id);
  }

  @RequirePermissions(Permission.FACTURACION_EMITIR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFacturaDto,
  ) {
    return this.facturacionService.create(tenantId, userId, dto);
  }

  @RequirePermissions(Permission.FACTURACION_EMITIR)
  @Post(':id/emitir')
  emitir(@Param('id') id: string) {
    return this.facturacionService.emitir(id);
  }

  @RequirePermissions(Permission.FACTURACION_ANULAR)
  @Post(':id/anular')
  anular(@Param('id') id: string, @Body() dto: AnularFacturaDto) {
    return this.facturacionService.anular(id, dto);
  }
}
