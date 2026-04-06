import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
import { Transaccion, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Reportes, TransaccionFilters, PaginationParams, PaginatedResult } from '../common/types';

@Injectable()
export class TransaccionesService {
  private logger = new Logger(TransaccionesService.name);
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    this.logger.log('TransaccionesService created its own PrismaClient');
  }

  async create(createTransaccionDto: CreateTransaccionDto): Promise<Transaccion> {
    try {
      return await this.prisma.transaccion.create({
        data: {
          ...createTransaccionDto,
          fecha: new Date(createTransaccionDto.fecha),
        },
        include: {
          motivo: true,
          categoria: true,
          archivos: true,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error creating transaccion: ' + message);
      throw new InternalServerErrorException('Error al crear transacción');
    }
  }

  async findAll(filtros?: TransaccionFilters, pagination?: PaginationParams): Promise<PaginatedResult<Transaccion>> {
    const where = this.buildWhereClause(filtros);
    
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaccion.findMany({
        where,
        include: {
          motivo: { include: { categoria: true } },
          categoria: true,
          archivos: true,
        },
        orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.transaccion.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Transaccion> {
    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id },
      include: {
        motivo: { include: { categoria: true } },
        categoria: true,
        archivos: true,
      },
    });

    if (!transaccion || transaccion.eliminado) {
      throw new NotFoundException(`Transacción ${id} no encontrada`);
    }
    return transaccion;
  }

  async update(id: string, updateTransaccionDto: UpdateTransaccionDto): Promise<Transaccion> {
    await this.findOne(id);

    const data: any = { ...updateTransaccionDto };
    if (updateTransaccionDto.fecha) {
      data.fecha = new Date(updateTransaccionDto.fecha);
    }

    try {
      return await this.prisma.transaccion.update({
        where: { id },
        data,
        include: {
          motivo: { include: { categoria: true } },
          categoria: true,
          archivos: true,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error updating transaccion: ' + message);
      throw new InternalServerErrorException('Error al actualizar transacción');
    }
  }

  async remove(id: string): Promise<Transaccion> {
    await this.findOne(id);

    return this.prisma.transaccion.update({
      where: { id },
      data: { eliminado: true },
    });
  }

  async getReportes(): Promise<Reportes> {
    const transacciones = await this.prisma.transaccion.findMany({
      where: { eliminado: false },
      include: {
        categoria: true,
      },
    });

    let totalIngresos = 0;
    let totalGastos = 0;
    const porCategoria: Record<string, { nombre: string; tipo: string; total: number }> = {};

    for (const t of transacciones) {
      const monto = Number(t.monto);
      if (t.categoria.tipo === 'ingreso') {
        totalIngresos += monto;
      } else {
        totalGastos += monto;
      }

      const catId = t.categoriaId;
      if (!porCategoria[catId]) {
        porCategoria[catId] = {
          nombre: t.categoria.nombre,
          tipo: t.categoria.tipo,
          total: 0,
        };
      }
      porCategoria[catId].total += monto;
    }

    return {
      totalIngresos,
      totalGastos,
      balance: totalIngresos - totalGastos,
      porCategoria: Object.values(porCategoria),
    };
  }

  /**
   * Obtiene todas las transacciones, categorías y motivos de un mes específico
   * para generar el reporte mensual jerárquico.
   */
  async getReporteMensual(anio: number, mes: number) {
    // Fecha inicio y fin del mes en UTC para evitar desfase de zona horaria
    const fechaInicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0));
    const fechaFin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));

    // Obtener todas las transacciones del mes
    const transacciones = await this.prisma.transaccion.findMany({
      where: {
        eliminado: false,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      include: {
        motivo: true,
        categoria: true,
      },
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { motivo: { orden: 'asc' } },
        { fecha: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Obtener todas las categorías y motivos para incluir los que no tienen transacciones
    const [categorias, motivos] = await Promise.all([
      this.prisma.categoria.findMany({
        where: { eliminado: false },
        orderBy: { orden: 'asc' },
      }),
      this.prisma.motivo.findMany({
        where: { eliminado: false },
        orderBy: [{ categoriaId: 'asc' }, { orden: 'asc' }],
      }),
    ]);

    return {
      transacciones,
      categorias,
      motivos,
      anio,
      mes,
      nombreMes: fechaInicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    };
  }

  /**
   * Construye la cláusula where para Prisma según los filtros recibidos
   */
  private buildWhereClause(filtros?: TransaccionFilters): any {
    const where: any = { eliminado: false };

    if (!filtros) return where;

    // Filtro por rango de fechas
    if (filtros.fechaInicio || filtros.fechaFin) {
      where.fecha = {};
      if (filtros.fechaInicio) {
        where.fecha.gte = new Date(filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        where.fecha.lte = new Date(filtros.fechaFin);
      }
    }

    // Filtro por categoría
    if (filtros.categoriaId) {
      where.categoriaId = filtros.categoriaId;
    }

    // Filtro por motivo
    if (filtros.motivoId) {
      where.motivoId = filtros.motivoId;
    }

    return where;
  }
}
