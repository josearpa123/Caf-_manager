import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Headers,
} from '@nestjs/common';
import { validarLlave } from '../../prisma/idempotencia';
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

  // Antes de `:id` para que "disponibles" no se tome como un id.
  @RequirePermissions(Permission.ANTICIPOS_VER)
  @Get('disponibles')
  disponibles(@Query('proveedorId') proveedorId: string) {
    return this.anticiposService.disponibles(proveedorId);
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
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.anticiposService.create(
      tenantId,
      userId,
      dto,
      validarLlave(idempotencyKey),
    );
  }
}
