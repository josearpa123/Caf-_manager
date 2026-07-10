import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoIdentificacion } from '@prisma/client';

export class UpdateProveedorDto {
  @IsOptional()
  @IsEnum(TipoIdentificacion)
  tipoIdentificacion?: TipoIdentificacion;

  @IsOptional()
  @IsString()
  numeroIdentificacion?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  vereda?: string;

  @IsOptional()
  @IsString()
  municipio?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
