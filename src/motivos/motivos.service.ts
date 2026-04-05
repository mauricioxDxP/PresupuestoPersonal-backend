import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';
import { Motivo, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ReorderItem } from '../common/types';

@Injectable()
export class MotivosService {
  private logger = new Logger(MotivosService.name);
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    this.logger.log('MotivosService created its own PrismaClient');
  }

  async create(createMotivoDto: CreateMotivoDto): Promise<Motivo> {
    try {
      return await this.prisma.motivo.create({
        data: createMotivoDto,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('Error creating motivo: ' + message);
      throw new InternalServerErrorException('Error al crear motivo');
    }
  }

  async findAll(categoriaId?: string): Promise<Motivo[]> {
    const where: any = { eliminado: false };

    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    return this.prisma.motivo.findMany({
      where,
      include: { categoria: true },
      orderBy: { orden: 'asc' },
    });
  }

  async findOne(id: string): Promise<Motivo> {
    const motivo = await this.prisma.motivo.findUnique({
      where: { id },
      include: { categoria: true },
    });

    if (!motivo || motivo.eliminado) {
      throw new NotFoundException(`Motivo ${id} no encontrado`);
    }
    return motivo;
  }

  async update(id: string, updateMotivoDto: UpdateMotivoDto): Promise<Motivo> {
    await this.findOne(id);

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

  async remove(id: string): Promise<Motivo> {
    await this.findOne(id);

    return this.prisma.motivo.update({
      where: { id },
      data: { eliminado: true },
    });
  }

  async reorder(motivos: ReorderItem[]): Promise<Motivo[]> {
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
