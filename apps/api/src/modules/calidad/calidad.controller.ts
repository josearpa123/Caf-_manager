import { Controller, Get } from '@nestjs/common';
import { Modulo, Permission } from '@prisma/client';
import { CalidadService } from './calidad.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModulo } from '../../common/decorators/require-modulo.decorator';

@Controller('calidad')
@RequireModulo(Modulo.RECEPCION)
export class CalidadController {
  constructor(private readonly calidadService: CalidadService) {}

  @RequirePermissions(Permission.CALIDAD_VER)
  @Get('defectos-tipo')
  findDefectosTipo() {
    return this.calidadService.findDefectosTipo();
  }
}
