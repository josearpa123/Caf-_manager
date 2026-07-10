import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantPlatformDto } from './dto/update-tenant-platform.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Public } from '../../common/decorators/public.decorator';
import { PlatformAuthGuard } from '../../common/guards/platform-auth.guard';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('auth/login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformService.login(dto);
  }

  @Public()
  @UseGuards(PlatformAuthGuard)
  @Get('tenants')
  listTenants() {
    return this.platformService.listTenants();
  }

  @Public()
  @UseGuards(PlatformAuthGuard)
  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.platformService.createTenant(dto);
  }

  @Public()
  @UseGuards(PlatformAuthGuard)
  @Patch('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantPlatformDto) {
    return this.platformService.updateTenant(id, dto);
  }

  @Public()
  @UseGuards(PlatformAuthGuard)
  @Get('planes')
  listPlanes() {
    return this.platformService.listPlanes();
  }

  @Public()
  @UseGuards(PlatformAuthGuard)
  @Post('planes')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.platformService.createPlan(dto);
  }

  @Public()
  @UseGuards(PlatformAuthGuard)
  @Patch('planes/:id')
  updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.platformService.updatePlan(id, dto);
  }
}
