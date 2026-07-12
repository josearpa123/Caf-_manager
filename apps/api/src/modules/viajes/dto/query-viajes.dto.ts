import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoViaje } from '@prisma/client';

export class QueryViajesDto {
  @IsOptional()
  @IsEnum(EstadoViaje)
  estado?: EstadoViaje;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
