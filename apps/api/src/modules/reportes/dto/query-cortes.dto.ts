import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export type AgrupacionCorte = 'semana' | 'mes' | 'trimestre';

export class QueryCortesDto {
  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  // Cómo agrupar los cortes en la serie temporal. Por defecto, mensual.
  @IsOptional()
  @IsIn(['semana', 'mes', 'trimestre'])
  agrupacion?: AgrupacionCorte;
}
