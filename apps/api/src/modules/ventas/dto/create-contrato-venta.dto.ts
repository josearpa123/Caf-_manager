import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { TipoInventario } from '@prisma/client';

export class CreateContratoVentaDto {
  @IsString()
  puntoCompraId: string;

  @IsOptional()
  @IsString()
  compradorId?: string;

  @IsString()
  compradorNombre: string;

  @IsEnum(TipoInventario)
  tipoCafe: TipoInventario;

  @IsNumber()
  @IsPositive()
  cantidadKgPactada: number;

  @IsNumber()
  @IsPositive()
  precioKg: number;

  // Solo informativo: si pasa la fecha y quedan kg sin entregar, la API
  // marca el contrato como `vencido: true` en la respuesta, pero no lo
  // cancela ni bloquea nuevas entregas — lo decide el operador.
  @IsOptional()
  @IsDateString()
  fechaLimite?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
