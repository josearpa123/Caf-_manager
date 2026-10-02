import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const LIMITE_BUSQUEDA_MAX = 20;
export const LIMITE_BUSQUEDA_DEFECTO = 10;

export class BuscarProveedoresDto {
  // Cédula, nombre o apodo, completo o parcial, mientras se escribe.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_BUSQUEDA_MAX)
  limit?: number;
}
