import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateViajeDto {
  // Fecha del despacho. Si no se envía, se usa la fecha actual.
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  destino?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  placa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  // Ventas que se asignan al viaje al crearlo (opcional).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ventaIds?: string[];
}
