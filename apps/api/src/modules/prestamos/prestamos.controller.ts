import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PrestamosService } from './prestamos.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { CreateAbonoPrestamoDto } from './dto/create-abono-prestamo.dto';
import { QueryPrestamosDto } from './dto/query-prestamos.dto';

@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}

  @RequirePermissions(Permission.PRESTAMOS_VER)
  @Get()
  findAll(@Query() query: QueryPrestamosDto) {
    return this.prestamosService.findAll(query);
  }

  @RequirePermissions(Permission.PRESTAMOS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prestamosService.findOne(id);
  }

  @RequirePermissions(Permission.PRESTAMOS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePrestamoDto,
  ) {
    return this.prestamosService.create(tenantId, userId, dto);
  }

  @RequirePermissions(Permission.PRESTAMOS_EDITAR)
  @Post(':id/abonos')
  addAbono(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAbonoPrestamoDto,
  ) {
    return this.prestamosService.addAbono(id, tenantId, userId, dto);
  }

  @RequirePermissions(Permission.PRESTAMOS_EDITAR)
  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.prestamosService.cancelar(id);
  }
}
