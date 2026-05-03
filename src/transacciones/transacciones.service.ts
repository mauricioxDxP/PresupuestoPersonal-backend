import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
import { Transaccion, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Reportes, TransaccionFilters, PaginationParams, PaginatedResult, Rol } from '../common/types';
import { PermissionService } from '../auth/services/permission.service';
import { getUserCasaIdsFromDb, requireMaestroCasaRol } from '../common/auth-helpers';

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

  private async getCasaIds(user: AuthUser): Promise<string[]> {
    if (!user) return [];
    if (user.rol === Rol.ADMIN) return [];
    if (user.casaIds?.length) return user.casaIds;
    return getUserCasaIdsFromDb(this.prisma, user.id);
  }

  private async buildCasaFilter(user: AuthUser | undefined): Promise<object> {
    if (!user) return {};
    if (user.rol === Rol.ADMIN) return {};
    const casaIds = await this.getCasaIds(user);
    if (!casaIds.length) return { id: 'NULL_CASA_ACCESS_DENIED' };
    return { casaId: { in: casaIds } };
  }

  async create(createTransaccionDto: CreateTransaccionDto, user: AuthUser): Promise<Transaccion> {
    let casaIds = user.casaIds || [];
    if (!casaIds.length) {
      casaIds = await this.getCasaIds(user);
    }
    if (!casaIds.length) {
      throw new ForbiddenException('No tienes una casa asignada');
    }

    // Verify user has permission to create in this categoria/motivo
    if (user.rol !== Rol.ADMIN) {
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

    const casaId = createTransaccionDto.casaId || casaIds[0];
    if (user.rol !== Rol.ADMIN && !casaIds.includes(casaId)) {
      throw new ForbiddenException('La casa no te pertenece');
    }

    try {
      const transaccion = await this.prisma.transaccion.create({
        data: {
          ...createTransaccionDto,
          fecha: new Date(createTransaccionDto.fecha),
          casaId,
          usuarioId: user.id,
        },
        include: {
          motivo: true,
          categoria: true,
          archivos: {
            where: { eliminado: false },
          },
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      });

      // Registrar historial de creación
      await this.prisma.transaccionHistorial.create({
        data: {
          transaccionId: transaccion.id,
          accion: 'CREAR',
          usuarioId: user.id,
          datosNuevos: transaccion as any,
        },
      });

      return transaccion;
    } catch (error) {
      this.logger.error('Error al crear transacción:', error);
      throw new InternalServerErrorException('Error al crear la transacción');
    }
  }

  async getHistorial(transaccionId: string): Promise<any[]> {
    const historial = await this.prisma.transaccionHistorial.findMany({
      where: { transaccionId },
      include: {
        usuario: { select: { id: true, nombre: true, email: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    return historial;
  }

  async findAll(
    filtros: TransaccionFilters,
    pagination: PaginationParams,
    user?: AuthUser,
    xCasaId?: string,
  ): Promise<PaginatedResult<Transaccion>> {
    const where = await this.buildWhereClause(filtros, user, xCasaId);
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.transaccion.findMany({
        where,
        include: {
          motivo: { include: { categoria: true } },
          categoria: true,
          archivos: { where: { eliminado: false } },
          usuario: { select: { id: true, nombre: true, email: true } },
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaccion.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user?: AuthUser): Promise<Transaccion> {
    const casaFilter = await this.buildCasaFilter(user);

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
    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id, eliminado: false },
      select: { id: true, casaId: true },
    });

    if (!transaccion) {
      throw new NotFoundException(`Transacción ${id} no encontrada`);
    }

    // Verify user has permission to edit (USUARIO needs specific permission)
    if (user?.rol !== Rol.ADMIN) {
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
      // Obtener estado actual antes de actualizar
      const estadoAnterior = await this.prisma.transaccion.findUnique({
        where: { id },
        include: {
          motivo: { include: { categoria: true } },
          categoria: true,
          archivos: { where: { eliminado: false } },
        },
      });

      const updated = await this.prisma.transaccion.update({
        where: { id },
        data,
        include: {
          motivo: { include: { categoria: true } },
          categoria: true,
          archivos: {
            where: { eliminado: false },
          },
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      });

      // Registrar historial de modificación
      if (estadoAnterior && user) {
        await this.prisma.transaccionHistorial.create({
          data: {
            transaccionId: id,
            accion: 'MODIFICAR',
            usuarioId: user.id,
            datosAnteriores: estadoAnterior as any,
            datosNuevos: updated as any,
          },
        });
      }

      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error updating transaccion: ' + message);
      throw new InternalServerErrorException('Error al actualizar transacción');
    }
  }

  async remove(id: string, user?: AuthUser): Promise<Transaccion> {
    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id, eliminado: false },
      include: {
        motivo: { include: { categoria: true } },
        categoria: true,
        archivos: { where: { eliminado: false } },
      },
    });

    if (!transaccion) {
      throw new NotFoundException(`Transacción ${id} no encontrada`);
    }

    await requireMaestroCasaRol(this.prisma, user!, transaccion.casaId, 'eliminar transacciones');

    const deleted = await this.prisma.transaccion.update({
      where: { id },
      data: { eliminado: true },
    });

    // Registrar historial de eliminación
    if (user) {
      await this.prisma.transaccionHistorial.create({
        data: {
          transaccionId: id,
          accion: 'ELIMINAR',
          usuarioId: user.id,
          datosAnteriores: transaccion as any,
        },
      });
    }

    return deleted;
  }

  async getReportes(filtros?: TransaccionFilters, user?: AuthUser, xCasaId?: string): Promise<Reportes> {
    const where = await this.buildWhereClause(filtros, user, xCasaId);

    const transacciones = await this.prisma.transaccion.findMany({
      where,
      include: {
        categoria: true,
      },
    });

    let totalIngresos = 0;
    let totalGastos = 0;
    const porCategoria: Record<string, { nombre: string; tipo: string; total: number; orden: number }> = {};

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
          orden: t.categoria.orden,
        };
      }
      porCategoria[catId].total += monto;
    }

    const resultado = Object.values(porCategoria).sort((a, b) => a.orden - b.orden);

    return {
      totalIngresos,
      totalGastos,
      balance: totalIngresos - totalGastos,
      porCategoria: resultado,
    };
  }

  async getReporteMensual(anio: number, mes: number, user?: AuthUser, xCasaId?: string) {
    const casaFilter = await this.buildCasaFilter(user);

    let casaIdFilter: any = {};
    if (xCasaId && user?.rol !== Rol.ADMIN) {
      casaIdFilter = { casaId: xCasaId };
    }

    const fechaInicio = new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0));
    const fechaFin = new Date(Date.UTC(anio, mes, 0, 23, 59, 59, 999));

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

  private async buildWhereClause(filtros?: TransaccionFilters, user?: AuthUser, xCasaId?: string): Promise<any> {
    const casaFilter = await this.buildCasaFilter(user);
    const where: any = {
      ...casaFilter,
      eliminado: false
    };

    if (xCasaId && user?.rol !== Rol.ADMIN) {
      where.casaId = xCasaId;
    }

    if (!filtros) return where;

    if (filtros.fechaInicio || filtros.fechaFin) {
      where.fecha = {};
      if (filtros.fechaInicio) {
        where.fecha.gte = new Date(filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        where.fecha.lte = new Date(filtros.fechaFin);
      }
    }

    if (filtros.categoriaId) {
      where.categoriaId = filtros.categoriaId;
    }

    if (filtros.motivoId) {
      where.motivoId = filtros.motivoId;
    }

    return where;
  }
}