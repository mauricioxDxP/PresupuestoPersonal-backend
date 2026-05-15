import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ConversionesService } from './conversiones.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';

@Controller('conversiones')
export class ConversionesController {
  constructor(private readonly conversionesService: ConversionesService) {}

  @Get()
  async getTasaActual() {
    const tasa = await this.conversionesService.getTasaActual();
    if (!tasa) {
      return {
        monedaOrigen: 'BOB',
        monedaDestino: 'USD',
        tasaCambio: null,
        fuente: null,
        actualizadoEl: null,
        mensaje: 'No hay tasa disponible. Ejecute POST /conversiones/actualizar',
      };
    }
    return tasa;
  }

  @Post('actualizar')
  @UseGuards(JwtAuthGuard)
  async actualizarTasa() {
    return this.conversionesService.actualizarTasa();
  }
}