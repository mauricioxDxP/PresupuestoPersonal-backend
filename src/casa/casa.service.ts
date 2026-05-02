import { Injectable } from '@nestjs/common';
import { CreateCasaDto } from './dto/create-casa.dto';
import { UpdateCasaDto } from './dto/update-casa.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../common/types';

@Injectable()
export class CasaService {
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async create(createCasaDto: CreateCasaDto) {
    return this.prisma.casa.create({
      data: createCasaDto,
    });
  }

  async findAll() {
    return this.prisma.casa.findMany({
      include: {
        usuariosMiembros: {
          where: { usuario: { eliminado: false } },
          include: { usuario: { select: { id: true, email: true, nombre: true, rol: true } } },
        },
        _count: {
          select: { usuariosMiembros: true, categorias: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.casa.findUnique({
      where: { id },
      include: {
        usuariosMiembros: {
          where: { usuario: { eliminado: false } },
          include: { usuario: { select: { id: true, email: true, nombre: true, rol: true } } },
        },
        categorias: { where: { eliminado: false } },
      },
    });
  }

  async update(id: string, updateCasaDto: UpdateCasaDto) {
    return this.prisma.casa.update({
      where: { id },
      data: updateCasaDto,
    });
  }

  async remove(id: string) {
    const casa = await this.prisma.casa.findUnique({ where: { id } });
    if (!casa) {
      throw new Error('Casa no encontrada');
    }

    return this.prisma.casa.update({
      where: { id },
      data: { nombre: `${casa.nombre} (eliminada)` },
    });
  }

  async assignUsuario(casaId: string, usuarioId: string, rol: Rol = Rol.USUARIO) {
    // Verificar que la casa existe
    const casa = await this.prisma.casa.findUnique({ where: { id: casaId } });
    if (!casa) {
      throw new Error('Casa no encontrada');
    }

    // Verificar que el usuario existe
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId, eliminado: false } });
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Crear o actualizar la relación
    return this.prisma.usuarioCasa.upsert({
      where: {
        usuarioId_casaId: { usuarioId, casaId },
      },
      update: { rol },
      create: { usuarioId, casaId, rol },
      include: { usuario: { select: { id: true, email: true, nombre: true } } },
    });
  }

  async removeUsuario(casaId: string, usuarioId: string) {
    return this.prisma.usuarioCasa.delete({
      where: { usuarioId_casaId: { usuarioId, casaId } },
    });
  }
}