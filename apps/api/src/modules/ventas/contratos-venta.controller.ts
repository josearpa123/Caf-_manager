import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { ContratosVentaService } from './contratos-venta.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateContratoVentaDto } from './dto/create-contrato-venta.dto';
import { QueryContratosVentaDto } from './dto/query-contratos-venta.dto';

@Controller('contratos-venta')
@RequireModulo(Modulo.VENTAS)
export class ContratosVentaController {
  constructor(private readonly contratosVentaService: ContratosVentaService) {}

  @RequirePermissions(Permission.VENTAS_VER)
  @Get()
  findAll(@Query() query: QueryContratosVentaDto) {
    return this.contratosVentaService.findAll(query);
  }

  @RequirePermissions(Permission.VENTAS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contratosVentaService.findOne(id);
  }

  @RequirePermissions(Permission.VENTAS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateContratoVentaDto,
  ) {
    return this.contratosVentaService.create(tenantId, userId, dto);
  }

  @RequirePermissions(Permission.VENTAS_EDITAR)
  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.contratosVentaService.cancelar(id);
  }
}
