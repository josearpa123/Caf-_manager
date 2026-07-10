import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxUsuarios?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPuntosCompra?: number;
}
