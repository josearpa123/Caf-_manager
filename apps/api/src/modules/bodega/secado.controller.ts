import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Permission } from '@prisma/client';
import { SecadoService } from './secado.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateProcesoSecadoDto } from './dto/create-proceso-secado.dto';
import { FinalizarProcesoSecadoDto } from './dto/finalizar-proceso-secado.dto';
import { QueryPuntoCompraDto } from './dto/query-punto-compra.dto';

@Controller('bodega/secado')
export class SecadoController {
  constructor(private readonly secadoService: SecadoService) {}

  @RequirePermissions(Permission.BODEGA_VER)
  @Get()
  findAll(@Query() query: QueryPuntoCompraDto) {
    return this.secadoService.findAll(query);
  }

  @RequirePermissions(Permission.BODEGA_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.secadoService.findOne(id);
  }

  @RequirePermissions(Permission.BODEGA_SECADO_GESTIONAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProcesoSecadoDto,
  ) {
    return this.secadoService.create(tenantId, userId, dto);
  }

  @RequirePermissions(Permission.BODEGA_SECADO_GESTIONAR)
  @Patch(':id/finalizar')
  finalizar(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: FinalizarProcesoSecadoDto,
  ) {
    return this.secadoService.finalizar(tenantId, userId, id, dto);
  }
}
