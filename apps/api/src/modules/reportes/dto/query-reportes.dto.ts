import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryReportesDto {
  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
