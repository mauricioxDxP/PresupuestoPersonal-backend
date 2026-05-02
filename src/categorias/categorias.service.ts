import { Injectable, NotFoundException, InternalServerErrorException, Logger, ForbiddenException } from '@nestjs/common';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../common/types';

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
    if (user.rol === Rol.ADMIN) return []; // ADMIN no necesita filtro
    // Usar casaIds del JWT solo si tiene, sino consultar DB
    if (user.casaIds?.length) return user.casaIds;
    const usuarioCasas = await this.prisma.usuarioCasa.findMany({
      where: { usuarioId: user.id },
      select: { casaId: true },
    });
    return usuarioCasas.map(uc => uc.casaId);
  }

  private async buildCasaFilter(user: AuthUser | undefined): Promise<object> {
    if (!user) return {};
    if (user.rol === Rol.ADMIN) return {};
    const casaIds = await this.getCasaIds(user);
    if (!casaIds.length) return { id: 'NULL_CASA_ACCESS_DENIED' };
    return { casaId: { in: casaIds } };
  }

  async create(createCategoriaDto: CreateCategoriaDto, user: AuthUser): Promise<Categoria> {
    // Get casaIds from JWT first, fall back to DB if empty
    let casaIds = user.casaIds || [];
    if (!casaIds.length) {
      casaIds = await this.getCasaIds(user);
    }
    if (!casaIds.length) {
      throw new ForbiddenException('No tienes una casa asignada');
    }

    // For non-ADMIN, use the first casaId (or validate against provided casaId)
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
      
      // Apply x-casa-id filter if provided (for non-ADMIN users)
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
    await this.findOne(id, user);

    // Verify user has permission to edit
    if (user && user.rol === Rol.USUARIO) {
      throw new ForbiddenException('No tienes permisos para editar categorías');
    }

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
    await this.findOne(id, user);

    // Verify user has permission to delete
    if (user && user.rol === Rol.USUARIO) {
      throw new ForbiddenException('No tienes permisos para eliminar categorías');
    }

    return await this.prisma.categoria.update({
      where: { id },
      data: { eliminado: true },
    });
  }
}
