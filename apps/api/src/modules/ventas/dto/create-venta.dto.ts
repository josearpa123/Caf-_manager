import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TipoInventario } from '@prisma/client';
import { VentaLoteOrigenDto } from './venta-lote-origen.dto';

export class CreateVentaDto {
  @IsString()
  puntoCompraId: string;

  // Si se indica, la venta cuenta como una entrega parcial (o total) contra
  // ese contrato: tipoCafe, precioKg y comprador quedan fijados por el
  // contrato (se ignoran/derivan, no hace falta enviarlos).
  @IsOptional()
  @IsString()
  contratoVentaId?: string;

  @ValidateIf((dto: CreateVentaDto) => !dto.contratoVentaId)
  @IsEnum(TipoInventario)
  tipoCafe?: TipoInventario;

  @IsOptional()
  @IsString()
  compradorId?: string;

  // Siempre presente si no hay contrato: texto libre o copiado del
  // Comprador seleccionado.
  @ValidateIf((dto: CreateVentaDto) => !dto.contratoVentaId)
  @IsString()
  compradorNombre?: string;

  @IsNumber()
  @IsPositive()
  cantidadKg: number;

  @ValidateIf((dto: CreateVentaDto) => !dto.contratoVentaId)
  @IsNumber()
  @IsPositive()
  precioKg?: number;

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
