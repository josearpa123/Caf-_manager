import { Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class QueryPrecioVigenteDto {
  @IsString()
  puntoCompraId: string;

  @Type(() => Number)
  @IsNumber()
  humedad: number;

  @Type(() => Number)
  @IsNumber()
  factorRendimiento: number;
}
