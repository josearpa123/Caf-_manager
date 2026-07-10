import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TipoIdentificacion } from '@prisma/client';

export class CreateProveedorDto {
  @IsEnum(TipoIdentificacion)
  tipoIdentificacion: TipoIdentificacion;

  @IsString()
  @IsNotEmpty()
  numeroIdentificacion: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

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
}
