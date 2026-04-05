import { Module } from '@nestjs/common';
import { MotivosService } from './motivos.service';
import { MotivosController } from './motivos.controller';

@Module({
  providers: [MotivosService],
  controllers: [MotivosController],
  exports: [MotivosService],
})
export class MotivosModule {}
