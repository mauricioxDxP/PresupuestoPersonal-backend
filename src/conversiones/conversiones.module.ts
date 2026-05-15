import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConversionesService } from './conversiones.service';
import { ConversionesController } from './conversiones.controller';
import { ConversionesCron } from './conversiones.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ConversionesService, ConversionesCron],
  controllers: [ConversionesController],
  exports: [ConversionesService],
})
export class ConversionesModule {}