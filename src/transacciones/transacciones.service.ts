import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
import { Transaccion, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Reportes, TransaccionFilters, PaginationParams, PaginatedResult, Rol } from '../common/types';
import { PermissionService } from '../auth/services/permission.service';

interface AuthUser {
  id: string;
  rol: Rol;
  casaIds: string[];
}

@Injectable()
export class TransaccionesService {
  private logger = new Logger(TransaccionesService.name);
  private prisma: PrismaClient;
  private permissionService: PermissionService;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    this.permissionService = new PermissionService();
    this.logger.log('TransaccionesService created its own PrismaClient');
  }

  private buildCasaFilter(user: AuthUser | undefined): object {
    if (!user) return {};
    if (user.rol === Rol.ADMIN) return {};
    if (!user.casaIds?.length) return { id: 'NULL_CASA_ACCESS_DENIED' };
    return { casaId: { in: user.casaIds } };
  }

  async create(createTransaccionDto: CreateTransaccionDto, user: AuthUser): Promise<Transaccion> {
    if (!user?.casaIds?.length) {
      throw new ForbiddenException('No tienes una casa asignada');
    }

    // Verify user has permission to create in this categoria/motivo
    if (user.rol === Rol.USUARIO) {
      const hasPermission = await this.permissionService.checkPermission(
        user.id,
        createTransaccionDto.categoriaId,
        createTransaccionDto.motivoId,
        'crear',
      );
      if (!hasPermission) {
        throw new ForbiddenException('No tienes permisos para crear transacciones en esta categoría');
      }
    }

    // Use the casaId from the transaccion or default to first casa
    const casaId = createTransaccionDto.casaId || user.casaIds[0];
    if (user.rol !== Rol.ADMIN && !user.casaIds.includes(casaId)) {
      throw new ForbiddenException('La casa no te pertenece');
    }

    try {
      return await this.prisma.transaccion.create({
        data: {
          ...createTransaccionDto,
          fecha: new Date(createTransaccionDto.fecha),
          casaId,
        },
        include: {
          motivo: true,
          categoria: true,
          archivos: {
            where: { eliminado: false },
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error creating transaccion: ' + message);
      throw new InternalServerErrorException('Error al crear transacción');
    }
  }

  async findAll(
    filtros?: TransaccionFilters, 
    pagination?: PaginationParams,
    user?: AuthUser,
    xCasaId?: string,
  ): Promise<PaginatedResult<Transaccion>> {
    const where = this.buildWhereClause(filtros, user, xCasaId);
    
    const page = Math.max(1, pagination?.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? 20));
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaccion.findMany({
        where,
        include: {
          motivo: { include: { categoria: true } },
          categoria: true,
          archivos: {
            where: { eliminado: false },
          },
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

  async findOne(id: string, user?: AuthUser): Promise<Transaccion> {
    const casaFilter = this.buildCasaFilter(user);

    const transaccion = await this.prisma.transaccion.findFirst({
      where: { 
        id, 
        ...casaFilter,
        eliminado: false 
      },
      include: {
        motivo: { include: { categoria: true } },
        categoria: true,
        archivos: {
          where: { eliminado: false },
        },
      },
    });

    if (!transaccion || transaccion.eliminado) {
      throw new NotFoundException(`Transacción ${id} no encontrada`);
    }
    return transaccion;
  }

  async update(id: string, updateTransaccionDto: UpdateTransaccionDto, user?: AuthUser): Promise<Transaccion> {
    await this.findOne(id, user);

    // Verify user has permission to edit
    if (user && user.rol === Rol.USUARIO) {
      // For update, we need to check the categoria/motivo being updated to
      const categoriaId = updateTransaccionDto.categoriaId;
      const motivoId = updateTransaccionDto.motivoId;
      
      if (categoriaId || motivoId) {
        const hasPermission = await this.permissionService.checkPermission(
          user.id,
          categoriaId || '',
          motivoId || null,
          'editar',
        );
        if (!hasPermission) {
          throw new ForbiddenException('No tienes permisos para editar esta transacción');
        }
      }
    }

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
          archivos: {
            where: { eliminado: false },
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error updating transaccion: ' + message);
      throw new InternalServerErrorException('Error al actualizar transacción');
    }
  }

  async remove(id: string, user?: AuthUser): Promise<Transaccion> {
    await this.findOne(id, user);

    // Verify user has permission to delete
    if (user && user.rol === Rol.USUARIO) {
      throw new ForbiddenException('No tienes permisos para eliminar transacciones');
    }

    return this.prisma.transaccion.update({
      where: { id },
      data: { eliminado: true },
    });
  }

  async getReportes(filtros?: TransaccionFilters, user?: AuthUser, xCasaId?: string): Promise<Reportes> {
    const where = this.buildWhereClause(filtros, user, xCasaId);

    const transacciones = await this.prisma.transaccion.findMany({
      where,
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
  async getReporteMensual(anio: number, mes: number, user?: AuthUser, xCasaId?: string) {
    const casaFilter = this.buildCasaFilter(user);

    // Apply x-casa-id filter if provided (for non-ADMIN users)
    let casaIdFilter: any = {};
    if (xCasaId && user?.rol !== Rol.ADMIN) {
      casaIdFilter = { casaId: xCasaId };
    }

    // Fecha inicio y fin del mes en UTC para evitar desfase de zona horaria
    const fechaInicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0));
    const fechaFin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));

    // Obtener todas las transacciones del mes
    const transacciones = await this.prisma.transaccion.findMany({
      where: {
        eliminado: false,
        ...casaFilter,
        ...casaIdFilter,
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
        where: { eliminado: false, ...casaFilter, ...casaIdFilter },
        orderBy: { orden: 'asc' },
      }),
      this.prisma.motivo.findMany({
        where: { eliminado: false, ...casaFilter, ...casaIdFilter },
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
  private buildWhereClause(filtros?: TransaccionFilters, user?: AuthUser, xCasaId?: string): any {
    const where: any = { 
      ...this.buildCasaFilter(user),
      eliminado: false 
    };

    // Apply x-casa-id filter if provided (for non-ADMIN users)
    if (xCasaId && user?.rol !== Rol.ADMIN) {
      where.casaId = xCasaId;
    }

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
