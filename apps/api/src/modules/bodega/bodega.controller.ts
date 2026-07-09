import { Controller } from '@nestjs/common';
import { BodegaService } from './bodega.service';

@Controller('bodega')
export class BodegaController {
  constructor(private readonly bodegaService: BodegaService) {}
}
