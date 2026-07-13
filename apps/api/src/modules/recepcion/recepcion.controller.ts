import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { RecepcionService } from './recepcion.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRecepcionDto } from './dto/create-recepcion.dto';
import { QueryRecepcionesDto } from './dto/query-recepciones.dto';

@Controller('recepcion')
@RequireModulo(Modulo.RECEPCION)
export class RecepcionController {
  constructor(private readonly recepcionService: RecepcionService) {}

  @RequirePermissions(Permission.RECEPCION_VER)
  @Get()
  findAll(@Query() query: QueryRecepcionesDto) {
    return this.recepcionService.findAll(query);
  }

  @RequirePermissions(Permission.RECEPCION_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recepcionService.findOne(id);
  }

  @RequirePermissions(Permission.RECEPCION_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateRecepcionDto,
  ) {
    return this.recepcionService.create(tenantId, userId, dto);
  }
}
