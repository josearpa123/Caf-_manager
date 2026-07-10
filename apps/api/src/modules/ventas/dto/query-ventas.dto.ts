import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoInventario } from '@prisma/client';

export class QueryVentasDto {
  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsString()
  compradorId?: string;

  @IsOptional()
  @IsEnum(TipoInventario)
  tipoCafe?: TipoInventario;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
