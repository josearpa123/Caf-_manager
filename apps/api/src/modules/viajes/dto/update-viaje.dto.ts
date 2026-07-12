import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoViaje } from '@prisma/client';

export class UpdateViajeDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  destino?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  placa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsOptional()
  @IsEnum(EstadoViaje)
  estado?: EstadoViaje;
}
