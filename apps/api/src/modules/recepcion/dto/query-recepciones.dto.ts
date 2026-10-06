import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoRecepcion, TipoCafeRecepcion } from '@prisma/client';

export class QueryRecepcionesDto {
  @IsOptional()
  @IsString()
  proveedorId?: string;

  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsEnum(TipoCafeRecepcion)
  tipoCafe?: TipoCafeRecepcion;

  @IsOptional()
  @IsEnum(EstadoRecepcion)
  estado?: EstadoRecepcion;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
