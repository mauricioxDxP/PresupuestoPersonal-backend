import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';
import { Motivo, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ReorderItem, Rol } from '../common/types';

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

  private buildCasaFilter(user: AuthUser | undefined): object {
    if (!user) return {};
    if (user.rol === Rol.ADMIN) return {};
    if (!user.casaIds?.length) return { id: 'NULL_CASA_ACCESS_DENIED' };
    return { casaId: { in: user.casaIds } };
  }

  async create(createMotivoDto: CreateMotivoDto, user: AuthUser): Promise<Motivo> {
    if (!user?.casaIds?.length) {
      throw new ForbiddenException('No tienes una casa asignada');
    }

    // For non-ADMIN, validate that the casaId belongs to user
    const casaId = createMotivoDto.casaId || user.casaIds[0];
    if (user.rol !== Rol.ADMIN && !user.casaIds.includes(casaId)) {
      throw new ForbiddenException('La casa no te pertenece');
    }

    // Verify categoria belongs to user's casa
    if (user.rol !== Rol.ADMIN) {
      const categoria = await this.prisma.categoria.findUnique({
        where: { id: createMotivoDto.categoriaId },
      });
      if (!categoria || !user.casaIds.includes(categoria.casaId)) {
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
    const where: any = { 
      ...this.buildCasaFilter(user),
      eliminado: false 
    };

    // Apply x-casa-id filter if provided (for non-ADMIN users)
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
    const casaFilter = this.buildCasaFilter(user);

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
    await this.findOne(id, user);

    // Verify user has permission to edit
    if (user && user.rol === Rol.USUARIO) {
      throw new ForbiddenException('No tienes permisos para editar motivos');
    }

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
    await this.findOne(id, user);

    // Verify user has permission to delete
    if (user && user.rol === Rol.USUARIO) {
      throw new ForbiddenException('No tienes permisos para eliminar motivos');
    }

    return await this.prisma.motivo.update({
      where: { id },
      data: { eliminado: true },
    });
  }

  async reorder(motivos: ReorderItem[], user?: AuthUser): Promise<Motivo[]> {
    // Verify user has permission
    if (user && user.rol === Rol.USUARIO) {
      throw new ForbiddenException('No tienes permisos para reordenar motivos');
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
