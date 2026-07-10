import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { MetodoPago } from '@prisma/client';

export class CreatePagoDto {
  @IsString()
  proveedorId: string;

  @IsString()
  puntoCompraId: string;

  // Atajo opcional: pago directo asociado a una recepción puntual.
  @IsOptional()
  @IsString()
  recepcionId?: string;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  referencia?: string;

  @ValidateIf((dto: CreatePagoDto) => dto.metodoPago === MetodoPago.CHEQUE)
  @IsString()
  numeroCheque?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
