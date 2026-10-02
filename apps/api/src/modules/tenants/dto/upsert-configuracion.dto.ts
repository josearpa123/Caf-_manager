import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ModoCompraPergamino } from '@prisma/client';

export class UpsertConfiguracionDto {
  @IsNumber()
  humedadMinAceptable: number;

  @IsNumber()
  humedadMaxAceptable: number;

  @IsOptional()
  @IsNumber()
  rendimientoMinAceptable?: number;

  @IsOptional()
  @IsNumber()
  rendimientoMaxAceptable?: number;

  @IsOptional()
  @IsNumber()
  saldoProveedorUmbral?: number;

  // Peso del saco vacío en kg; permite calcular la tara a partir del número de sacos.
  @IsOptional()
  @IsNumber()
  @IsPositive()
  taraPorSacoKg?: number;

  // Si es true, las compras de café pergamino o mojado retienen en la fuente.
  @IsOptional()
  @IsBoolean()
  esAgenteRetencion?: boolean;

  // Cómo compra café seco este negocio por defecto: midiendo humedad y factor,
  // o a un precio por kilo. En cada compra se puede cambiar.
  @IsOptional()
  @IsEnum(ModoCompraPergamino)
  modoCompraPergamino?: ModoCompraPergamino;
}
