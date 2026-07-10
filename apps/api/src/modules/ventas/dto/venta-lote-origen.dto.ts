import { IsNumber, IsPositive, IsString } from 'class-validator';

export class VentaLoteOrigenDto {
  @IsString()
  recepcionId: string;

  @IsNumber()
  @IsPositive()
  cantidadKgAtribuida: number;
}
