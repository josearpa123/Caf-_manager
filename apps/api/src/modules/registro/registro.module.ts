import { Module } from '@nestjs/common';
import { RegistroController } from './registro.controller';
import { RegistroService } from './registro.service';

@Module({
  controllers: [RegistroController],
  providers: [RegistroService],
})
export class RegistroModule {}
