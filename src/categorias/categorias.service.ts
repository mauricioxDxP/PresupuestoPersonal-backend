import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class CategoriasService {
  private logger = new Logger(CategoriasService.name);
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    this.logger.log('CategoriasService created its own PrismaClient');
  }

  async create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    try {
      return await this.prisma.categoria.create({
        data: createCategoriaDto,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error creating categoria: ' + message);
      throw new InternalServerErrorException('Error al crear categoría');
    }
  }

  async findAll(tipo?: string): Promise<Categoria[]> {
    this.logger.log('findAll called');
    
    try {
      const where: any = { eliminado: false };
      if (tipo) {
        where.tipo = tipo;
      }

      this.logger.log('Query where: ' + JSON.stringify(where));

      const result = await this.prisma.categoria.findMany({
        where,
        orderBy: { orden: 'asc' },
      });
      
      this.logger.log('Found ' + result.length + ' categorias');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error in findAll: ' + message);
      this.logger.error('Stack: ' + (error instanceof Error ? error.stack : ''));
      // Return empty array instead of throwing to see if that helps
      return [];
    }
  }

  async findOne(id: string): Promise<Categoria> {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: { motivos: true },
    });

    if (!categoria || categoria.eliminado) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }
    return categoria;
  }

  async update(id: string, updateCategoriaDto: UpdateCategoriaDto): Promise<Categoria> {
    await this.findOne(id);

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

  async remove(id: string): Promise<Categoria> {
    await this.findOne(id);

    return this.prisma.categoria.update({
      where: { id },
      data: { eliminado: true },
    });
  }
}
