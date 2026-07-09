import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
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
}
