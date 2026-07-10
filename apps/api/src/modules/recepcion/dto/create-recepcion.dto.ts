import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TipoCafeRecepcion } from '@prisma/client';
import { CreateAnalisisCalidadDto } from './create-analisis-calidad.dto';

export class CreateRecepcionDto {
  @IsString()
  puntoCompraId: string;

  @IsString()
  proveedorId: string;

  @IsEnum(TipoCafeRecepcion)
  tipoCafe: TipoCafeRecepcion;

  @IsNumber()
  @IsPositive()
  pesoBruto: number;

  @IsNumber()
  @Min(0)
  pesoTara: number;

  @ValidateIf(
    (dto: CreateRecepcionDto) => dto.tipoCafe === TipoCafeRecepcion.MOJADO,
  )
  @ValidateNested()
  @Type(() => CreateAnalisisCalidadDto)
  analisisCalidad?: CreateAnalisisCalidadDto;

  // Precio directo negociado, solo para PASILLA (no pasa por la tabla de precios).
  @ValidateIf(
    (dto: CreateRecepcionDto) => dto.tipoCafe === TipoCafeRecepcion.PASILLA,
  )
  @IsNumber()
  @IsPositive()
  precioKg?: number;
}
