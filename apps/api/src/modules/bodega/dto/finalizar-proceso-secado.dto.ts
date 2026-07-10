import { IsNumber, IsPositive } from 'class-validator';

export class FinalizarProcesoSecadoDto {
  @IsNumber()
  @IsPositive()
  pesoSecoResultanteKg: number;
}
