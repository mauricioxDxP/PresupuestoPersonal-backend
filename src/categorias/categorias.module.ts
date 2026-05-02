import { Module } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';
import { CasaMiddlewareModule } from '../common/middleware/casa-middleware.module';

@Module({
  imports: [CasaMiddlewareModule],
  providers: [CategoriasService],
  controllers: [CategoriasController],
  exports: [CategoriasService],
})
export class CategoriasModule {}
