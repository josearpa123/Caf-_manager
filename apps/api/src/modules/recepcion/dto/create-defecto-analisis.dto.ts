import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDefectoAnalisisDto {
  @IsString()
  defectoTipoId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  porcentaje?: number;
}
