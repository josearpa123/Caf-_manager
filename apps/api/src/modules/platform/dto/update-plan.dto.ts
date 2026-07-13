import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Modulo } from '@prisma/client';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre?: string;

  // null limpia el precio y devuelve el plan a "a convenir".
  @IsOptional()
  @IsInt()
  @Min(0)
  precioMensual?: number | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUsuarios?: number;

  // null limpia el límite y deja los puntos de compra ilimitados.
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPuntosCompra?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Modulo, { each: true })
  modulos?: Modulo[];
}
