import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { PagosService } from './pagos.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePagoDto } from './dto/create-pago.dto';
import { QueryPagosDto } from './dto/query-pagos.dto';

@Controller('pagos')
@RequireModulo(Modulo.PAGOS)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @RequirePermissions(Permission.PAGOS_VER)
  @Get()
  findAll(@Query() query: QueryPagosDto) {
    return this.pagosService.findAll(query);
  }

  @RequirePermissions(Permission.PAGOS_VER)
  @Get('cuenta/:proveedorId')
  estadoCuenta(@Param('proveedorId') proveedorId: string) {
    return this.pagosService.estadoCuenta(proveedorId);
  }

  @RequirePermissions(Permission.PAGOS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagosService.findOne(id);
  }

  @RequirePermissions(Permission.PAGOS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePagoDto,
  ) {
    return this.pagosService.create(tenantId, userId, dto);
  }
}
