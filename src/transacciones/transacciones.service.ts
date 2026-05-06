import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
import { Transaccion, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Reportes, TransaccionFilters, PaginationParams, PaginatedResult, Rol } from '../common/types';
import { PermissionService } from '../auth/services/permission.service';
import { getUserCasaIdsFromDb, requireMaestroCasaRol, getPerCasaRol, hasFullAccess } from '../common/auth-helpers';

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

  /**
   * Obtiene los IDs de categorías y motivos que el USUARIO puede ver
   * Retorna null si el usuario es ADMIN o MAESTRO_CASA (puede ver todo)
   * Considera Perfil de permisos primero, luego permisos individuales
   */
  private async getVisibleCategoriaMotivoIds(
    user: AuthUser,
    casaIds: string[]
  ): Promise<{ categoriaIds: string[]; motivoIds: string[]; canViewOthers: boolean } | null> {
    // ADMIN global ve todo
    if (user.rol === Rol.ADMIN) return null;

    // Check per-casa rol: si es MAESTRO_CASA en CUALQUIER casa, ve todo
    for (const casaId of casaIds) {
      const perCasaRol = await getPerCasaRol(this.prisma, user, casaId);
      if (perCasaRol === Rol.MAESTRO_CASA) return null;
    }

    // Si no tiene casas asignadas, no ve nada
    if (!user.casaIds?.length) return null;

    // Obtener Perfiles asignados al usuario para estas casas
    const usuarioPerfis = await this.prisma.usuarioPerfil.findMany({
      where: { usuarioId: user.id, casaId: { in: casaIds } },
      include: {
        perfil: {
          include: {
            categoriaPermisos: true,
            motivoPermisos: true,
          },
        },
      },
    });

    // Map of casaId -> perfil permisos
    const perfilPermisosMap = new Map<string, { categoriaIds: Set<string>; motivoIds: Set<string>; canViewOthers: boolean }>();
    for (const up of usuarioPerfis) {
      const perfil = up.perfil;
      const categoriaIds = new Set(perfil.categoriaPermisos.filter(cp => cp.puedeVer).map(cp => cp.categoriaId));
      const motivoIds = new Set(perfil.motivoPermisos.filter(mp => mp.puedeVer).map(mp => mp.motivoId));
      const canViewOthers = perfil.categoriaPermisos.every(cp => cp.puedeVerTransaccionesOtros) &&
                           perfil.motivoPermisos.every(mp => mp.puedeVerTransaccionesOtros);
      perfilPermisosMap.set(up.casaId, { categoriaIds, motivoIds, canViewOthers });
    }

    const visibleCategoriaIds: string[] = [];
    const visibleMotivoIds: string[] = [];
    let canViewOthers = true;
    let hasAnyPerfil = false;

    // Obtener todas las categorías y motivos de las casas del usuario
    const [categorias, motivos] = await Promise.all([
      this.prisma.categoria.findMany({
        where: { casaId: { in: casaIds }, eliminado: false },
        select: { id: true, casaId: true },
      }),
      this.prisma.motivo.findMany({
        where: { casaId: { in: casaIds }, eliminado: false },
        select: { id: true, categoriaId: true, casaId: true },
      }),
    ]);

    const categoriaIds = categorias.map(c => c.id);
    const motivoIds = motivos.map(m => m.id);

    // Batch query for individual permisos (instead of one by one in a loop)
    const [catPermisos, motPermisos] = await Promise.all([
      this.prisma.usuarioCategoriaPermiso.findMany({
        where: { usuarioId: user.id, categoriaId: { in: categoriaIds } },
      }),
      this.prisma.usuarioMotivoPermiso.findMany({
        where: { usuarioId: user.id, motivoId: { in: motivoIds } },
      }),
    ]);

    const catPermisoMap = new Map(catPermisos.map(cp => [cp.categoriaId, cp]));
    const motPermisoMap = new Map(motPermisos.map(mp => [mp.motivoId, mp]));

    // Verificar permisos para cada categoría
    for (const cat of categorias) {
      const perfilData = perfilPermisosMap.get(cat.casaId);

      if (perfilData) {
        // Usar permisos del Perfil
        hasAnyPerfil = true;
        if (perfilData.categoriaIds.has(cat.id)) {
          visibleCategoriaIds.push(cat.id);
          if (!perfilData.canViewOthers) {
            canViewOthers = false;
          }
        }
      } else {
        // Usar permisos individuales del map
        const catPermiso = catPermisoMap.get(cat.id);

        if (catPermiso?.puedeVer) {
          visibleCategoriaIds.push(cat.id);
          if (!catPermiso.puedeVerTransaccionesOtros) {
            canViewOthers = false;
          }
        }
      }
    }

    // Verificar permisos para cada motivo
    for (const mot of motivos) {
      const perfilData = perfilPermisosMap.get(mot.casaId);

      if (perfilData) {
        // Usar permisos del Perfil
        if (perfilData.motivoIds.has(mot.id)) {
          visibleMotivoIds.push(mot.id);
          if (!perfilData.canViewOthers) {
            canViewOthers = false;
          }
        }
      } else {
        // Usar permisos individuales del map
        const motPermiso = motPermisoMap.get(mot.id);

        if (motPermiso?.puedeVer) {
          visibleMotivoIds.push(mot.id);
          if (!motPermiso.puedeVerTransaccionesOtros) {
            canViewOthers = false;
          }
        }
      }
    }

    // If user has at least one perfil but no visibility found, they see nothing from that casa
    if (hasAnyPerfil && visibleCategoriaIds.length === 0 && visibleMotivoIds.length === 0) {
      return { categoriaIds: [], motivoIds: [], canViewOthers: false };
    }

    return { categoriaIds: visibleCategoriaIds, motivoIds: visibleMotivoIds, canViewOthers };
  }

  async create(createTransaccionDto: CreateTransaccionDto, user: AuthUser): Promise<Transaccion> {
    console.log('[TransaccionesService] create:', { dto: createTransaccionDto, user: { id: user.id, rol: user.rol, casaIds: user.casaIds } });
    
    let casaIds = user.casaIds || [];
    if (!casaIds.length) {
      casaIds = await this.getCasaIds(user);
    }
    if (!casaIds.length) {
      throw new ForbiddenException('No tienes una casa asignada');
    }

    const casaId = createTransaccionDto.casaId || casaIds[0];

    // Verify user has permission to create in this categoria/motivo
    // Skip if user is ADMIN global OR MAESTRO_CASA per-casa
    const isFullAccess = await hasFullAccess(this.prisma, user, casaId);
    if (!isFullAccess) {
      console.log('[TransaccionesService] Checking permission for user:', user.id, 'categoria:', createTransaccionDto.categoriaId, 'motivo:', createTransaccionDto.motivoId);
      const hasPermission = await this.permissionService.checkPermission(
        user.id,
        createTransaccionDto.categoriaId,
        createTransaccionDto.motivoId,
        'crear',
      );
      console.log('[TransaccionesService] Permission result:', hasPermission);
      if (!hasPermission) {
        throw new ForbiddenException('No tienes permisos para crear transacciones en esta categoría');
      }
    }

    console.log('[TransaccionesService] casaId resolved:', casaId, 'user.casaIds:', user.casaIds);
    if (!isFullAccess && !casaIds.includes(casaId)) {
      throw new ForbiddenException('La casa no te pertenece');
    }

    // Verify categoria belongs to the casa
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: createTransaccionDto.categoriaId },
    });
    console.log('[TransaccionesService] categoria:', categoria);

    try {
      const monto = createTransaccionDto.monto
        ? parseFloat(createTransaccionDto.monto)
        : 0;
      
      const transaccion = await this.prisma.transaccion.create({
        data: {
          motivoId: createTransaccionDto.motivoId,
          categoriaId: createTransaccionDto.categoriaId,
          monto: isNaN(monto) ? 0 : monto,
          fecha: new Date(createTransaccionDto.fecha),
          descripcion: createTransaccionDto.descripcion,
          facturable: createTransaccionDto.facturable ?? false,
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
      console.log('[TransaccionesService] Creating historial...');
      await this.prisma.transaccionHistorial.create({
        data: {
          transaccionId: transaccion.id,
          accion: 'CREAR',
          usuarioId: user.id,
          datosNuevos: JSON.parse(JSON.stringify(transaccion)),
        },
      });
      console.log('[TransaccionesService] Historial created successfully');

      return transaccion;
    } catch (error) {
      console.log('[TransaccionesService] Error creating transaction:', error);
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
    // Skip if user is ADMIN global OR MAESTRO_CASA per-casa
    const isFullAccess = user ? await hasFullAccess(this.prisma, user, transaccion.casaId) : false;
    if (!isFullAccess && user) {
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
    if (updateTransaccionDto.monto) {
      const montoNum = parseFloat(String(updateTransaccionDto.monto));
      data.monto = isNaN(montoNum) ? 0 : montoNum;
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

    // Verify user has permission to delete (USUARIO needs specific permission)
    // Skip if user is ADMIN global OR MAESTRO_CASA per-casa
    const isFullAccess = user ? await hasFullAccess(this.prisma, user, transaccion.casaId) : false;
    if (!isFullAccess && user) {
      const categoriaId = transaccion.categoriaId;
      const motivoId = transaccion.motivoId;

      const hasPermission = await this.permissionService.checkPermission(
        user.id,
        categoriaId,
        motivoId,
        'eliminar',
      );
      if (!hasPermission) {
        throw new ForbiddenException('No tienes permisos para eliminar esta transacción');
      }
    }

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

    // Aplicar filtro de visibilidad para USUARIO
    let visibilidadFilter: any = {};
    if (user?.rol === Rol.USUARIO) {
      const casaIds = user.casaIds?.length ? user.casaIds : await this.getCasaIds(user);
      if (casaIds.length) {
        const visibility = await this.getVisibleCategoriaMotivoIds(user, casaIds);
        if (visibility) {
          visibilidadFilter.categoriaId = { in: visibility.categoriaIds };
          visibilidadFilter.motivoId = { in: visibility.motivoIds };
          if (!visibility.canViewOthers) {
            visibilidadFilter.usuarioId = user.id;
          }
        }
      }
    }

    const transacciones = await this.prisma.transaccion.findMany({
      where: {
        eliminado: false,
        ...casaFilter,
        ...casaIdFilter,
        ...visibilidadFilter,
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

    // Filtrar categorías y motivos visibles para el usuario
    let categoriasFilter: any = {};
    let motivosFilter: any = {};
    if (user?.rol === Rol.USUARIO) {
      const casaIds = user.casaIds?.length ? user.casaIds : await this.getCasaIds(user);
      if (casaIds.length) {
        const visibility = await this.getVisibleCategoriaMotivoIds(user, casaIds);
        if (visibility) {
          categoriasFilter = { id: { in: visibility.categoriaIds } };
          motivosFilter = { id: { in: visibility.motivoIds } };
        }
      }
    }

    const [categorias, motivos] = await Promise.all([
      this.prisma.categoria.findMany({
        where: { eliminado: false, ...casaFilter, ...casaIdFilter, ...categoriasFilter },
        orderBy: { orden: 'asc' },
      }),
      this.prisma.motivo.findMany({
        where: { eliminado: false, ...casaFilter, ...casaIdFilter, ...motivosFilter },
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

    // Aplicar filtro de visibilidad para USUARIO
    if (user?.rol === Rol.USUARIO) {
      const casaIds = user.casaIds?.length ? user.casaIds : await this.getCasaIds(user);
      if (casaIds.length) {
        const visibility = await this.getVisibleCategoriaMotivoIds(user, casaIds);
        if (visibility) {
          where.categoriaId = { in: visibility.categoriaIds };
          where.motivoId = { in: visibility.motivoIds };
          // Si no puede ver transacciones de otros, filtrar por usuario
          if (!visibility.canViewOthers) {
            where.usuarioId = user.id;
          }
        }
      }
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