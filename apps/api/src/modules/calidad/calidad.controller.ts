import { Controller } from '@nestjs/common';
import { CalidadService } from './calidad.service';

@Controller('calidad')
export class CalidadController {
  constructor(private readonly calidadService: CalidadService) {}
}
