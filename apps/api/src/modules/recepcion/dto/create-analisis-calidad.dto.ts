import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ModoFactorRendimiento } from '@prisma/client';
import { CreateDefectoAnalisisDto } from './create-defecto-analisis.dto';

export class CreateAnalisisCalidadDto {
  @IsNumber()
  @Min(0)
  humedad: number;

  @IsEnum(ModoFactorRendimiento)
  modoFactor: ModoFactorRendimiento;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  pesoMuestraKg?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  pesoAlmendraMuestraKg?: number;

  // Requerido solo si modoFactor = MANUAL; si es CALCULADO se ignora y se
  // recalcula a partir de pesoMuestraKg/pesoAlmendraMuestraKg.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  factorRendimiento?: number;

  @IsOptional()
  @IsNumber()
  densidad?: number;

  @IsOptional()
  @IsString()
  tamanoGrano?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDefectoAnalisisDto)
  defectos?: CreateDefectoAnalisisDto[];
}
