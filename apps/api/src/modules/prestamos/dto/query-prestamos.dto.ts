import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoPrestamo } from '@prisma/client';

export class QueryPrestamosDto {
  @IsOptional()
  @IsString()
  proveedorId?: string;

  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsEnum(EstadoPrestamo)
  estado?: EstadoPrestamo;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
