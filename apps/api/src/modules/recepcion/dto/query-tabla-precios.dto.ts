import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryTablaPreciosDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  puntoCompraId?: string;
}
