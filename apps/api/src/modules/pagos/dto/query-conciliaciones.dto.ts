import { IsOptional, IsString } from 'class-validator';

export class QueryConciliacionesDto {
  @IsOptional()
  @IsString()
  proveedorId?: string;

  @IsOptional()
  @IsString()
  anticipoId?: string;
}
