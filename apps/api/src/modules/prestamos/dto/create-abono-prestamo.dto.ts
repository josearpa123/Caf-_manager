import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  NotEquals,
} from 'class-validator';
import { MetodoPago } from '@prisma/client';

export class CreateAbonoPrestamoDto {
  @IsNumber()
  @IsPositive()
  monto: number;

  // Un abono a un préstamo es siempre dinero real que devuelve el proveedor;
  // no puede quedar "a crédito".
  @IsEnum(MetodoPago)
  @NotEquals(MetodoPago.CREDITO, {
    message: 'El método de pago de un abono no puede ser CREDITO',
  })
  metodoPago: MetodoPago;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
