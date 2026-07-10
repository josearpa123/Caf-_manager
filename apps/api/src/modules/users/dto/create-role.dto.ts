import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Permission } from '@prisma/client';

export class CreateRoleDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
