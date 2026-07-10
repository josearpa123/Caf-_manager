import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MaxLength(80)
  nombre: string;

  @IsInt()
  @IsPositive()
  maxUsuarios: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPuntosCompra?: number;
}
