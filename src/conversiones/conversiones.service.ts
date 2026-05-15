import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export interface ConversionRate {
  monedaOrigen: string;
  monedaDestino: string;
  tasaCambio: number;
  fuente: string;
  actualizadoEl: Date;
}

@Injectable()
export class ConversionesService {
  private logger = new Logger(ConversionesService.name);
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async getTasaActual(): Promise<ConversionRate | null> {
    const conversion = await this.prisma.conversion.findFirst({
      where: {
        monedaOrigen: 'BOB',
        monedaDestino: 'USD',
      },
    });

    if (!conversion) return null;

    return {
      monedaOrigen: conversion.monedaOrigen,
      monedaDestino: conversion.monedaDestino,
      tasaCambio: Number(conversion.tasaCambio),
      fuente: conversion.fuente,
      actualizadoEl: conversion.actualizadoEl,
    };
  }

  async actualizarTasa(): Promise<{ success: boolean; tasaCambio?: number; actualizadoEl?: Date; error?: string }> {
    try {
      this.logger.log('Iniciando actualización de tasa de cambio...');

      // Verificar si la última actualización fue hace menos de 55 minutos
      const ultimaActualizacion = await this.prisma.conversion.findFirst({
        where: { monedaOrigen: 'BOB', monedaDestino: 'USD' },
      });

      if (ultimaActualizacion) {
        const haceMinutos = (Date.now() - new Date(ultimaActualizacion.actualizadoEl).getTime()) / 60000;
        if (haceMinutos < 55) {
          this.logger.log(`Última actualización hace ${haceMinutos.toFixed(1)} minutos. Saltando...`);
          return {
            success: true,
            tasaCambio: Number(ultimaActualizacion.tasaCambio),
            actualizadoEl: ultimaActualizacion.actualizadoEl,
          };
        }
      }

      // Obtener tasa de exchangerate-api
      const response = await fetch('https://open.er-api.com/v6/latest/BOB');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { rates?: { USD?: number } };
      
      if (!data.rates || typeof data.rates.USD !== 'number') {
        throw new Error('Respuesta inválida de la API');
      }

      const tasaCambio = data.rates.USD;
      const ahora = new Date();

      // Upsert: crear o actualizar
      const conversion = await this.prisma.conversion.upsert({
        where: {
          monedaOrigen_monedaDestino: {
            monedaOrigen: 'BOB',
            monedaDestino: 'USD',
          },
        },
        update: {
          tasaCambio,
          fuente: 'exchangerate-api',
          actualizadoEl: ahora,
        },
        create: {
          monedaOrigen: 'BOB',
          monedaDestino: 'USD',
          tasaCambio,
          fuente: 'exchangerate-api',
          actualizadoEl: ahora,
        },
      });

      this.logger.log(`Tasa actualizada: ${tasaCambio} BOB/USD`);

      return {
        success: true,
        tasaCambio: Number(conversion.tasaCambio),
        actualizadoEl: conversion.actualizadoEl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error actualizando tasa: ${message}`);
      
      // Fallback: retornar última tasa válida si existe
      const ultimaTasa = await this.prisma.conversion.findFirst({
        where: { monedaOrigen: 'BOB', monedaDestino: 'USD' },
      });

      if (ultimaTasa) {
        return {
          success: false,
          tasaCambio: Number(ultimaTasa.tasaCambio),
          actualizadoEl: ultimaTasa.actualizadoEl,
          error: message,
        };
      }

      return { success: false, error: message };
    }
  }
}