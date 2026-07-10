import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { TipoInventario } from '@prisma/client';
import { VentaLoteOrigenDto } from './venta-lote-origen.dto';

export class CreateVentaDto {
  @IsString()
  puntoCompraId: string;

  @IsEnum(TipoInventario)
  tipoCafe: TipoInventario;

  @IsOptional()
  @IsString()
  compradorId?: string;

  // Siempre presente: texto libre o copiado del Comprador seleccionado.
  @IsString()
  compradorNombre: string;

  @IsNumber()
  @IsPositive()
  cantidadKg: number;

  @IsNumber()
  @IsPositive()
  precioKg: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  // Lotes/recepciones de origen para trazabilidad. La deducción de
  // inventario es siempre del stock agregado (no lote por lote exacto, ver
  // requerimientos.md "Ventas (detalle)"), pero la suma de estos montos debe
  // coincidir con cantidadKg.
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VentaLoteOrigenDto)
  lotesOrigen: VentaLoteOrigenDto[];
}
