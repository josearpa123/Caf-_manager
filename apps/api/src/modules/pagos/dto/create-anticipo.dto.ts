import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  NotEquals,
} from 'class-validator';
import { MetodoPago } from '@prisma/client';

export class CreateAnticipoDto {
  @IsString()
  proveedorId: string;

  @IsString()
  puntoCompraId: string;

  @IsNumber()
  @IsPositive()
  monto: number;

  // CREDITO no aplica a un anticipo: un anticipo es siempre un movimiento de
  // caja real hacia el proveedor, no puede quedar "a crédito".
  @IsEnum(MetodoPago)
  @NotEquals(MetodoPago.CREDITO, {
    message: 'El método de pago de un anticipo no puede ser CREDITO',
  })
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
