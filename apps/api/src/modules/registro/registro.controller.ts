import { Body, Controller, Get, Post } from '@nestjs/common';
import { RegistroService } from './registro.service';
import { Public } from '../../common/decorators/public.decorator';
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';

@Controller('registro')
export class RegistroController {
  constructor(private readonly registroService: RegistroService) {}

  @Public()
  @Get('planes')
  listPlanes() {
    return this.registroService.listPlanes();
  }

  @Public()
  @Post()
  registrar(@Body() dto: RegistrarTenantDto) {
    return this.registroService.registrar(dto);
  }
}
