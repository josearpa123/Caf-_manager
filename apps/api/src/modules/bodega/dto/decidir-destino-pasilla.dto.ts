import { IsEnum } from 'class-validator';
import { DestinoPasilla } from '@prisma/client';

export class DecidirDestinoPasillaDto {
  @IsEnum(DestinoPasilla)
  destino: DestinoPasilla;
}
