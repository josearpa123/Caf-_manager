import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnularRecepcionDto {
  // CU-02: motivo obligatorio, mínimo 10 caracteres (sin contar espacios de los bordes).
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(500)
  motivo: string;
}
