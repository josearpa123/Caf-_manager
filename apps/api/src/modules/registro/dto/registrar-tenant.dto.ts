import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombreTenant: string;

  @IsOptional()
  @IsString()
  nit?: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @IsNotEmpty()
  adminNombre: string;

  @IsOptional()
  @IsString()
  adminTelefono?: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;

  // Plan que el interesado elige en la página pública. El admin de
  // plataforma lo confirma (o cambia) al aprobar la cuenta — no queda
  // activo solo por elegirlo aquí.
  @IsOptional()
  @IsString()
  planId?: string;
}
