import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { TipoCafeRecepcion } from '@prisma/client';

export class QueryRetencionDto {
  @IsEnum(TipoCafeRecepcion)
  tipoCafe: TipoCafeRecepcion;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  valorTotal: number;
}
