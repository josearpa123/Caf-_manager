import { IsNumber, IsOptional } from 'class-validator';

export class UpsertConfiguracionDto {
  @IsNumber()
  humedadMinAceptable: number;

  @IsNumber()
  humedadMaxAceptable: number;

  @IsOptional()
  @IsNumber()
  rendimientoMinAceptable?: number;

  @IsOptional()
  @IsNumber()
  rendimientoMaxAceptable?: number;

  @IsOptional()
  @IsNumber()
  saldoProveedorUmbral?: number;
}
