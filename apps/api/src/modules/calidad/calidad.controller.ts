import { Controller, Get } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { CalidadService } from './calidad.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('calidad')
export class CalidadController {
  constructor(private readonly calidadService: CalidadService) {}

  @RequirePermissions(Permission.CALIDAD_VER)
  @Get('defectos-tipo')
  findDefectosTipo() {
    return this.calidadService.findDefectosTipo();
  }
}
