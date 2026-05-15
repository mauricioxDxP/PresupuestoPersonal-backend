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
import { PerfisModule } from './perfis/perfis.module';
import { ConversionesModule } from './conversiones/conversiones.module';

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
    PerfisModule,
    ConversionesModule,
  ],
})
export class AppModule {}
