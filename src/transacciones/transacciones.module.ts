import { Module } from '@nestjs/common';
import { TransaccionesService } from './transacciones.service';
import { TransaccionesController } from './transacciones.controller';
import { ReportesModule } from '../reportes/reportes.module';

@Module({
  imports: [ReportesModule],
  providers: [TransaccionesService],
  controllers: [TransaccionesController],
  exports: [TransaccionesService],
})
export class TransaccionesModule {}
