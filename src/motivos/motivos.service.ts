import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';
import { Motivo, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ReorderItem, Rol } from '../common/types';
import { getPerCasaRol, getUserCasaIdsFromDb, requireMaestroCasaRol, hasFullAccess } from '../common/auth-helpers';

interface AuthUser {
  id: string;
  rol: Rol;
  casaIds: string[];
}

@Injectable()
export class MotivosService {
  private logger = new Logger(MotivosService.name);
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    this.logger.log('MotivosService created its own PrismaClient');
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

  async create(createMotivoDto: CreateMotivoDto, user: AuthUser): Promise<Motivo> {
    let casaIds = user.casaIds || [];
    if (!casaIds.length) {
      casaIds = await this.getCasaIds(user);
    }
    if (!casaIds.length) {
      throw new ForbiddenException('No tienes una casa asignada');
    }

    const casaId = createMotivoDto.casaId || casaIds[0];
    const isFullAccess = await hasFullAccess(this.prisma, user, casaId);
    if (!isFullAccess && !casaIds.includes(casaId)) {
      throw new ForbiddenException('La casa no te pertenece');
    }

    // Verify categoria belongs to user's casa
    if (!isFullAccess) {
      const categoria = await this.prisma.categoria.findUnique({
        where: { id: createMotivoDto.categoriaId },
      });
      if (!categoria || !casaIds.includes(categoria.casaId)) {
        throw new ForbiddenException('La categoría no pertenece a tu casa');
      }
    }

    try {
      return await this.prisma.motivo.create({
        data: {
          ...createMotivoDto,
          casaId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error creating motivo: ' + message);
      throw new InternalServerErrorException('Error al crear motivo');
    }
  }

  async findAll(categoriaId?: string, user?: AuthUser, xCasaId?: string): Promise<Motivo[]> {
    const casaFilter = await this.buildCasaFilter(user);
    const where: any = {
      ...casaFilter,
      eliminado: false
    };

    if (xCasaId && user?.rol !== Rol.ADMIN) {
      where.casaId = xCasaId;
    }

    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    return this.prisma.motivo.findMany({
      where,
      include: { categoria: true },
      orderBy: { orden: 'asc' },
    });
  }

  async findOne(id: string, user?: AuthUser): Promise<Motivo> {
    const casaFilter = await this.buildCasaFilter(user);

    const motivo = await this.prisma.motivo.findFirst({
      where: {
        id,
        ...casaFilter,
        eliminado: false
      },
      include: { categoria: true },
    });

    if (!motivo || motivo.eliminado) {
      throw new NotFoundException(`Motivo ${id} no encontrado`);
    }
    return motivo;
  }

  async update(id: string, updateMotivoDto: UpdateMotivoDto, user?: AuthUser): Promise<Motivo> {
    const motivo = await this.prisma.motivo.findUnique({
      where: { id, eliminado: false },
      select: { id: true, casaId: true },
    });

    if (!motivo) {
      throw new NotFoundException(`Motivo ${id} no encontrado`);
    }

    await requireMaestroCasaRol(this.prisma, user!, motivo.casaId, 'editar motivos');

    try {
      return await this.prisma.motivo.update({
        where: { id },
        data: updateMotivoDto,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error updating motivo: ' + message);
      throw new InternalServerErrorException('Error al actualizar motivo');
    }
  }

  async remove(id: string, user?: AuthUser): Promise<Motivo> {
    const motivo = await this.prisma.motivo.findUnique({
      where: { id, eliminado: false },
      select: { id: true, casaId: true },
    });

    if (!motivo) {
      throw new NotFoundException(`Motivo ${id} no encontrado`);
    }

    await requireMaestroCasaRol(this.prisma, user!, motivo.casaId, 'eliminar motivos');

    return this.prisma.motivo.update({
      where: { id },
      data: { eliminado: true },
    });
  }

  async reorder(motivos: ReorderItem[], user?: AuthUser): Promise<Motivo[]> {
    if (user?.rol !== Rol.ADMIN) {
      // For non-ADMIN, we need to verify the user has access to all motivos being reordered
      const ids = motivos.map(m => m.id);
      const dbMotivos = await this.prisma.motivo.findMany({
        where: { id: { in: ids } },
        select: { id: true, casaId: true },
      });

      for (const motivo of dbMotivos) {
        await requireMaestroCasaRol(this.prisma, user!, motivo.casaId, 'reordenar motivos');
      }
    }

    const updates = motivos.map((m) =>
      this.prisma.motivo.update({
        where: { id: m.id },
        data: { orden: m.orden },
      })
    );

    try {
      return await this.prisma.$transaction(updates);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error reordering motivos: ' + message);
      throw new InternalServerErrorException('Error al reordenar motivos');
    }
  }
}