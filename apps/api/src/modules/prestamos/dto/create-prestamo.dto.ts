import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePrestamoDto {
  @IsString()
  proveedorId: string;

  @IsString()
  puntoCompraId: string;

  @IsNumber()
  @IsPositive()
  monto: number;

  @IsOptional()
  @IsString()
  notas?: string;
}
