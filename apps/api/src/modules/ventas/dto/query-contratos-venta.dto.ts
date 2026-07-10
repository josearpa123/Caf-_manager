import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoContratoVenta } from '@prisma/client';

export class QueryContratosVentaDto {
  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsString()
  compradorId?: string;

  @IsOptional()
  @IsEnum(EstadoContratoVenta)
  estado?: EstadoContratoVenta;
}
