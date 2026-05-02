import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { CategoriasModule } from './categorias/categorias.module';
import { MotivosModule } from './motivos/motivos.module';
import { TransaccionesModule } from './transacciones/transacciones.module';
import { ArchivosModule } from './archivos/archivos.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CasaModule } from './casa/casa.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HealthModule,
    AuthModule,
    CasaModule,
    UsersModule,
    CategoriasModule,
    MotivosModule,
    TransaccionesModule,
    ArchivosModule,
  ],
})
export class AppModule {}
