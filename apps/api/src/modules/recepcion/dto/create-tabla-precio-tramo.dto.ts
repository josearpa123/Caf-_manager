import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateTablaPrecioTramoDto {
  @IsDateString()
  fecha: string;

  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsNumber()
  @Min(0)
  factorMin: number;

  @IsNumber()
  @Min(0)
  factorMax: number;

  @IsNumber()
  @Min(0)
  humedadMin: number;

  @IsNumber()
  @Min(0)
  humedadMax: number;

  @IsNumber()
  @IsPositive()
  precioKg: number;
}
