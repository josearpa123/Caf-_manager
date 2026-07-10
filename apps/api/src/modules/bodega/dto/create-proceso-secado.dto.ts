import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateProcesoSecadoDto {
  @IsString()
  puntoCompraId: string;

  // Cada recepción listada se consume por completo (todo su pesoNeto pasa a
  // secado); no se soporta aporte parcial en el MVP.
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recepcionIds: string[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
