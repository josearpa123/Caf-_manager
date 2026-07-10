import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoTenant } from '@prisma/client';

export class UpdateTenantPlatformDto {
  @IsOptional()
  @IsString()
  planId?: string | null;

  @IsOptional()
  @IsEnum(EstadoTenant)
  estado?: EstadoTenant;
}
