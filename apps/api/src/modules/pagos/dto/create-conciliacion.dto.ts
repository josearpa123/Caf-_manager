import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateConciliacionDto {
  @IsString()
  proveedorId: string;

  @IsString()
  anticipoId: string;

  // Se debe indicar al menos uno de los dos (validado en el service): contra
  // qué recepción y/o qué pago formal se está aplicando el anticipo.
  @IsOptional()
  @IsString()
  recepcionId?: string;

  @IsOptional()
  @IsString()
  pagoId?: string;

  @IsNumber()
  @IsPositive()
  montoAplicado: number;

  @IsOptional()
  @IsString()
  notas?: string;
}
