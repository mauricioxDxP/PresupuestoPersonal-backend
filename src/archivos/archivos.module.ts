import { Module } from '@nestjs/common';
import { ArchivosService } from './archivos.service';
import { ArchivosController } from './archivos.controller';

@Module({
  providers: [ArchivosService],
  controllers: [ArchivosController],
  exports: [ArchivosService],
})
export class ArchivosModule {}
