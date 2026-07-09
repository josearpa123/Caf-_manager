import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePuntoCompraDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

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
}
