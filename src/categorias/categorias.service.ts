import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../common/types';
import { getPerCasaRol, getUserCasaIdsFromDb, requireMaestroCasaRol } from '../common/auth-helpers';

interface AuthUser {
  id: string;
  rol: Rol;
  casaIds: string[];
}

@Injectable()
export class CategoriasService {
  private logger = new Logger(CategoriasService.name);
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    this.logger.log('CategoriasService created its own PrismaClient');
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

  async create(createCategoriaDto: CreateCategoriaDto, user: AuthUser): Promise<Categoria> {
    let casaIds = user.casaIds || [];
    if (!casaIds.length) {
      casaIds = await this.getCasaIds(user);
    }
    if (!casaIds.length) {
      throw new ForbiddenException('No tienes una casa asignada');
    }

    const casaId = createCategoriaDto.casaId || casaIds[0];
    if (user.rol !== Rol.ADMIN && !casaIds.includes(casaId)) {
      throw new ForbiddenException('La casa no te pertenece');
    }

    try {
      return await this.prisma.categoria.create({
        data: {
          ...createCategoriaDto,
          casaId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error creating categoria: ' + message);
      throw new InternalServerErrorException('Error al crear categoría');
    }
  }

  async findAll(tipo?: string, user?: AuthUser, xCasaId?: string): Promise<Categoria[]> {
    try {
      const casaFilter = await this.buildCasaFilter(user);
      const where: any = {
        ...casaFilter,
        eliminado: false
      };

      if (xCasaId && user?.rol !== Rol.ADMIN) {
        where.casaId = xCasaId;
      }

      if (tipo) {
        where.tipo = tipo;
      }

      const result = await this.prisma.categoria.findMany({
        where,
        orderBy: { orden: 'asc' },
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error in findAll: ' + message);
      return [];
    }
  }

  async findOne(id: string, user?: AuthUser): Promise<Categoria> {
    const casaFilter = await this.buildCasaFilter(user);

    const categoria = await this.prisma.categoria.findFirst({
      where: {
        id,
        ...casaFilter,
        eliminado: false
      },
      include: { motivos: true },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }
    return categoria;
  }

  async update(id: string, updateCategoriaDto: UpdateCategoriaDto, user?: AuthUser): Promise<Categoria> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id, eliminado: false },
      select: { id: true, casaId: true },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }

    await requireMaestroCasaRol(this.prisma, user!, categoria.casaId, 'editar categorías');

    const data: any = { ...updateCategoriaDto };
    if (data.orden !== undefined) {
      data.orden = Number(data.orden);
    }

    try {
      return await this.prisma.categoria.update({
        where: { id },
        data,
      });
    } catch (_error) {
      throw new InternalServerErrorException('Error al actualizar categoría');
    }
  }

  async remove(id: string, user?: AuthUser): Promise<Categoria> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id, eliminado: false },
      select: { id: true, casaId: true },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }

    await requireMaestroCasaRol(this.prisma, user!, categoria.casaId, 'eliminar categorías');

    return this.prisma.categoria.update({
      where: { id },
      data: { eliminado: true },
    });
  }
}