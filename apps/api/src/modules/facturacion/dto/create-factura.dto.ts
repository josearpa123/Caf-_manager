import { IsString } from 'class-validator';

export class CreateFacturaDto {
  @IsString()
  recepcionId: string;
}
