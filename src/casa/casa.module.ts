import { Module } from '@nestjs/common';
import { CasaController } from './casa.controller';
import { CasaService } from './casa.service';

@Module({
  controllers: [CasaController],
  providers: [CasaService],
  exports: [CasaService],
})
export class CasaModule {}