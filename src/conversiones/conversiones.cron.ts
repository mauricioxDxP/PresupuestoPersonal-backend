import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConversionesService } from './conversiones.service';

@Injectable()
export class ConversionesCron {
  private readonly logger = new Logger(ConversionesCron.name);

  constructor(private readonly conversionesService: ConversionesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.log('Job de actualización de tasas iniciado...');
    
    const resultado = await this.conversionesService.actualizarTasa();
    
    if (resultado.success) {
      this.logger.log(`Tasa actualizada: ${resultado.tasaCambio} BOB/USD`);
    } else {
      this.logger.warn(`Actualización falló: ${resultado.error}. Usando fallback.`);
    }
  }
}