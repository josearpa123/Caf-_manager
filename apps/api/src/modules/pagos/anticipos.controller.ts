import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { AnticiposService } from './anticipos.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAnticipoDto } from './dto/create-anticipo.dto';
import { QueryAnticiposDto } from './dto/query-anticipos.dto';

@Controller('anticipos')
@RequireModulo(Modulo.PAGOS)
export class AnticiposController {
  constructor(private readonly anticiposService: AnticiposService) {}

  @RequirePermissions(Permission.ANTICIPOS_VER)
  @Get()
  findAll(@Query() query: QueryAnticiposDto) {
    return this.anticiposService.findAll(query);
  }

  @RequirePermissions(Permission.ANTICIPOS_VER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.anticiposService.findOne(id);
  }

  @RequirePermissions(Permission.ANTICIPOS_CREAR)
  @Post()
  create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAnticipoDto,
  ) {
    return this.anticiposService.create(tenantId, userId, dto);
  }
}
