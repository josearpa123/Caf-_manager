import { IsOptional, IsString } from 'class-validator';

export class QueryPuntoCompraDto {
  @IsOptional()
  @IsString()
  puntoCompraId?: string;
}
