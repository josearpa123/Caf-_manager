import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PuntosCompraService } from './puntos-compra.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePuntoCompraDto } from './dto/create-punto-compra.dto';
import { UpdatePuntoCompraDto } from './dto/update-punto-compra.dto';

@Controller('puntos-compra')
export class PuntosCompraController {
  constructor(private readonly puntosCompraService: PuntosCompraService) {}

  @RequirePermissions(Permission.PUNTOS_COMPRA_GESTIONAR)
  @Get()
  findAll() {
    return this.puntosCompraService.findAll();
  }

  @RequirePermissions(Permission.PUNTOS_COMPRA_GESTIONAR)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.puntosCompraService.findOne(id);
  }

  @RequirePermissions(Permission.PUNTOS_COMPRA_GESTIONAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreatePuntoCompraDto,
  ) {
    return this.puntosCompraService.create(tenantId, dto);
  }

  @RequirePermissions(Permission.PUNTOS_COMPRA_GESTIONAR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePuntoCompraDto) {
    return this.puntosCompraService.update(id, dto);
  }
}
