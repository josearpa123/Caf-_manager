import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoFactura } from '@prisma/client';

export class QueryFacturasDto {
  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsEnum(EstadoFactura)
  estado?: EstadoFactura;
}
