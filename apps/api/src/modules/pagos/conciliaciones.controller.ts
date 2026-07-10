import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { ConciliacionesService } from './conciliaciones.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateConciliacionDto } from './dto/create-conciliacion.dto';
import { QueryConciliacionesDto } from './dto/query-conciliaciones.dto';

@Controller('conciliaciones')
export class ConciliacionesController {
  constructor(private readonly conciliacionesService: ConciliacionesService) {}

  @RequirePermissions(Permission.ANTICIPOS_VER)
  @Get()
  findAll(@Query() query: QueryConciliacionesDto) {
    return this.conciliacionesService.findAll(query);
  }

  @RequirePermissions(Permission.ANTICIPOS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateConciliacionDto,
  ) {
    return this.conciliacionesService.create(tenantId, userId, dto);
  }
}
