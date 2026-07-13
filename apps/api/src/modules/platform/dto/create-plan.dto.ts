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

export class CreatePlanDto {
  @IsString()
  @MaxLength(80)
  nombre: string;

  // COP/mes. Omitirlo deja el plan "a convenir": la landing no muestra precio.
  @IsOptional()
  @IsInt()
  @Min(0)
  precioMensual?: number;

  @IsInt()
  @IsPositive()
  maxUsuarios: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPuntosCompra?: number;

  // Módulos incluidos. Se permite la lista vacía: un plan recién armado puede
  // quedar sin módulos mientras se define, y no afecta a nadie hasta que se
  // le asigne a un tenant.
  @IsArray()
  @ArrayUnique()
  @IsEnum(Modulo, { each: true })
  modulos: Modulo[];
}
