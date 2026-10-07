import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TipoCafeRecepcion } from '@prisma/client';
import { CreateAnalisisCalidadDto } from './create-analisis-calidad.dto';
import { PagoRecepcionDto } from './pago-recepcion.dto';

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

  // Si se omite, se calcula como numeroSacos × ConfiguracionTenant.taraPorSacoKg.
  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoTara?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  numeroSacos?: number;

  // Solo el PERGAMINO puede llevar análisis de calidad (humedad + factor de
  // rendimiento), y es opcional: quien compra café seco a precio por kilo envía
  // `precioKg` en su lugar. Con análisis, el precio sale de la tabla del día.
  @ValidateIf(
    (dto: CreateRecepcionDto) =>
      dto.tipoCafe === TipoCafeRecepcion.PERGAMINO &&
      dto.precioKg === undefined,
  )
  @ValidateNested()
  @Type(() => CreateAnalisisCalidadDto)
  analisisCalidad?: CreateAnalisisCalidadDto;

  // Precio directo negociado: obligatorio en MOJADO y PASILLA, y en PERGAMINO
  // cuando no se envía análisis de calidad (no pasa por la tabla de precios).
  @ValidateIf(
    (dto: CreateRecepcionDto) =>
      dto.tipoCafe !== TipoCafeRecepcion.PERGAMINO ||
      dto.analisisCalidad === undefined,
  )
  @IsNumber()
  @IsPositive()
  precioKg?: number;

  // RF-10: pagar en el mismo paso (anticipos y/o método de pago). Si se omite,
  // la recepción queda por pagar y se paga después desde Pagos.
  @IsOptional()
  @ValidateNested()
  @Type(() => PagoRecepcionDto)
  pago?: PagoRecepcionDto;
}
