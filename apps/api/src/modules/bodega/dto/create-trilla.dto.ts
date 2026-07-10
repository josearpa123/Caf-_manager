import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateTrillaDto {
  @IsString()
  puntoCompraId: string;

  @IsNumber()
  @IsPositive()
  pesoPergaminoKg: number;

  @IsNumber()
  @IsPositive()
  pesoAlmendraKg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoSubproductoKg?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
