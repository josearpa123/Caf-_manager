import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePuntoCompraDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
