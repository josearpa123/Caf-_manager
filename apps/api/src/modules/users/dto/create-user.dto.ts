import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  puntoCompraId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roleIds: string[];
}
