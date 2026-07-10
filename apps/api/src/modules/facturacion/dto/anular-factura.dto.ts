import { IsNotEmpty, IsString } from 'class-validator';

export class AnularFacturaDto {
  @IsString()
  @IsNotEmpty()
  motivo: string;
}
