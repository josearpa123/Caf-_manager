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

  // Solo PERGAMINO lleva análisis de calidad (humedad + factor de
  // rendimiento): es café que el proveedor ya secó por su cuenta. El mojado
  // recién lavado no se mide así, y la pasilla tampoco.
  @ValidateIf(
    (dto: CreateRecepcionDto) => dto.tipoCafe === TipoCafeRecepcion.PERGAMINO,
  )
  @ValidateNested()
  @Type(() => CreateAnalisisCalidadDto)
  analisisCalidad?: CreateAnalisisCalidadDto;

  // Precio directo negociado para MOJADO y PASILLA (no pasan por la tabla de precios).
  @ValidateIf(
    (dto: CreateRecepcionDto) => dto.tipoCafe !== TipoCafeRecepcion.PERGAMINO,
  )
  @IsNumber()
  @IsPositive()
  precioKg?: number;
}
