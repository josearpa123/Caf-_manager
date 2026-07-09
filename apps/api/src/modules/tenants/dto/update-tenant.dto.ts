import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsOptional()
  @IsString()
  razonSocial?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}
