import { Module } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { TransaccionesController } from './transacciones.controller';

@Module({
  providers: [TransaccionesService],
  controllers: [TransaccionesController],
  exports: [TransaccionesService],
})
export class TransaccionesModule {}
