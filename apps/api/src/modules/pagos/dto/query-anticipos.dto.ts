import { IsDateString, IsOptional, IsString } from 'class-validator';

export class QueryAnticiposDto {
  @IsOptional()
  @IsString()
  proveedorId?: string;

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
