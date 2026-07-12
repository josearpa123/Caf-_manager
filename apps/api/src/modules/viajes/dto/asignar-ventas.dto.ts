import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AsignarVentasDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ventaIds: string[];
}
