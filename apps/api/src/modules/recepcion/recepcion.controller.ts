import { Controller } from '@nestjs/common';
import { RecepcionService } from './recepcion.service';

@Controller('recepcion')
export class RecepcionController {
  constructor(private readonly recepcionService: RecepcionService) {}
}
