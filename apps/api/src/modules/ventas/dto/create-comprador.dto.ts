import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompradorDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  identificacion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}
