import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryProveedoresDto {
  // Busca por nombre, apodo o número de identificación (contiene, insensible a mayúsculas).
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  municipio?: string;
}
