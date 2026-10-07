import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MetodoPago } from '@prisma/client';

// El crédito (deuda pendiente) no es un pago: para eso se guarda la recepción sin `pago`.
export const METODOS_PAGO_EN_RECEPCION = [
  MetodoPago.EFECTIVO,
  MetodoPago.TRANSFERENCIA,
  MetodoPago.CHEQUE,
] as const;

export class AnticipoAplicadoDto {
  @IsString()
  anticipoId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  montoAplicado: number;
}

// RF-10: pago en el mismo paso de la compra. Cubre todo el neto a pagar:
// primero los anticipos indicados y el resto con `metodoPago`.
export class PagoRecepcionDto {
  @IsIn(METODOS_PAGO_EN_RECEPCION)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  referencia?: string;

  @ValidateIf((dto: PagoRecepcionDto) => dto.metodoPago === MetodoPago.CHEQUE)
  @IsString()
  numeroCheque?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AnticipoAplicadoDto)
  anticipos?: AnticipoAplicadoDto[];
}
