import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoCafeRecepcion } from '@prisma/client';

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
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
