import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { ConfiguracionService } from './configuracion.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpsertConfiguracionDto } from './dto/upsert-configuracion.dto';

@Controller('tenants/me/configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @RequirePermissions(Permission.CONFIGURACION_EMPRESA_GESTIONAR)
  @Get()
  get(@CurrentUser('tenantId') tenantId: string) {
    return this.configuracionService.get(tenantId);
  }

  @RequirePermissions(Permission.CONFIGURACION_EMPRESA_GESTIONAR)
  @Patch()
  upsert(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpsertConfiguracionDto,
  ) {
    return this.configuracionService.upsert(tenantId, dto);
  }
}
