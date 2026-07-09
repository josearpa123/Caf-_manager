import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { TenantsService } from './tenants.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @RequirePermissions(Permission.CONFIGURACION_EMPRESA_GESTIONAR)
  @Get('me')
  getMine(@CurrentUser('tenantId') tenantId: string) {
    return this.tenantsService.getMine(tenantId);
  }

  @RequirePermissions(Permission.CONFIGURACION_EMPRESA_GESTIONAR)
  @Patch('me')
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(tenantId, dto);
  }
}
