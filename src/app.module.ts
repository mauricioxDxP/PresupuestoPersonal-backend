import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { CategoriasModule } from './categorias/categorias.module';
import { MotivosModule } from './motivos/motivos.module';
import { TransaccionesModule } from './transacciones/transacciones.module';
import { ArchivosModule } from './archivos/archivos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    CategoriasModule,
    MotivosModule,
    TransaccionesModule,
    ArchivosModule,
  ],
})
export class AppModule {}
