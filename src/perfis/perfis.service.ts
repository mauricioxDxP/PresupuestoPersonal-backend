import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../common/types';
import { CreatePerfilDto, UpdatePerfilDto, AssignPerfilPermisoDto } from './dto/perfis.dto';

@Injectable()
export class PerfisService {
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async create(createPerfilDto: CreatePerfilDto, requestingUser: any) {
    // Only MAESTRO_CASA or ADMIN can create perfis
    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro o administrador puede crear perfiles');
    }

    // Check if perfil with same name exists in this casa
    const existing = await this.prisma.perfil.findFirst({
      where: { nombre: createPerfilDto.nombre, casaId: createPerfilDto.casaId },
    });

    if (existing) {
      throw new ConflictException('Ya existe un perfil con ese nombre en esta casa');
    }

    return this.prisma.perfil.create({
      data: {
        nombre: createPerfilDto.nombre,
        descripcion: createPerfilDto.descripcion,
        casaId: createPerfilDto.casaId,
      },
    });
  }

  async findAll(casaId: string, requestingUser: any) {
    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro o administrador puede ver perfiles');
    }

    return this.prisma.perfil.findMany({
      where: { casaId },
      include: {
        categoriaPermisos: {
          include: { categoria: { select: { id: true, nombre: true, tipo: true } } },
        },
        motivoPermisos: {
          include: { motivo: { select: { id: true, nombre: true, categoriaId: true } } },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string, requestingUser: any) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { id },
      include: {
        categoriaPermisos: {
          include: { categoria: { select: { id: true, nombre: true, tipo: true, casaId: true } } },
        },
        motivoPermisos: {
          include: { motivo: { select: { id: true, nombre: true, categoriaId: true, casaId: true } } },
        },
        usuarios: {
          include: { usuario: { select: { id: true, nombre: true, email: true } } },
        },
      },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    // Check access
    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(perfil.casaId)) {
      throw new ForbiddenException('No tienes acceso a este perfil');
    }

    return perfil;
  }

  async update(id: string, updatePerfilDto: UpdatePerfilDto, requestingUser: any) {
    const perfil = await this.prisma.perfil.findUnique({ where: { id } });

    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(perfil.casaId)) {
      throw new ForbiddenException('No tienes acceso a este perfil');
    }

    // Check duplicate name if updating nombre
    if (updatePerfilDto.nombre && updatePerfilDto.nombre !== perfil.nombre) {
      const existing = await this.prisma.perfil.findFirst({
        where: { nombre: updatePerfilDto.nombre, casaId: perfil.casaId, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un perfil con ese nombre en esta casa');
      }
    }

    return this.prisma.perfil.update({
      where: { id },
      data: updatePerfilDto,
    });
  }

  async delete(id: string, requestingUser: any) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { id },
      include: { usuarios: true },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(perfil.casaId)) {
      throw new ForbiddenException('No tienes acceso a este perfil');
    }

    // Check if perfil has users assigned
    if (perfil.usuarios.length > 0) {
      throw new ForbiddenException('No se puede eliminar un perfil con usuarios asignados');
    }

    // Delete in a transaction to ensure cascade
    await this.prisma.$transaction([
      this.prisma.perfilCategoriaPermiso.deleteMany({ where: { perfilId: id } }),
      this.prisma.perfilMotivoPermiso.deleteMany({ where: { perfilId: id } }),
      this.prisma.perfil.delete({ where: { id } }),
    ]);

    return { success: true };
  }

  async clone(id: string, requestingUser: any) {
    const original = await this.findOne(id, requestingUser);

    // Create new perfil with " (copia)" suffix
    const newPerfil = await this.prisma.perfil.create({
      data: {
        nombre: `${original.nombre} (copia)`,
        descripcion: original.descripcion,
        casaId: original.casaId,
      },
    });

    // Clone categoria permisos
    for (const cp of original.categoriaPermisos) {
      await this.prisma.perfilCategoriaPermiso.create({
        data: {
          perfilId: newPerfil.id,
          categoriaId: cp.categoriaId,
          puedeCrear: cp.puedeCrear,
          puedeEditar: cp.puedeEditar,
          puedeEliminar: cp.puedeEliminar,
          puedeVer: cp.puedeVer,
          puedeVerTransaccionesOtros: cp.puedeVerTransaccionesOtros,
        },
      });
    }

    // Clone motivo permisos
    for (const mp of original.motivoPermisos) {
      await this.prisma.perfilMotivoPermiso.create({
        data: {
          perfilId: newPerfil.id,
          motivoId: mp.motivoId,
          puedeCrear: mp.puedeCrear,
          puedeEditar: mp.puedeEditar,
          puedeEliminar: mp.puedeEliminar,
          puedeVer: mp.puedeVer,
          puedeVerTransaccionesOtros: mp.puedeVerTransaccionesOtros,
        },
      });
    }

    return this.findOne(newPerfil.id, requestingUser);
  }

  async assignCategoriaPermiso(
    perfilId: string,
    assignPermisoDto: AssignPerfilPermisoDto,
    requestingUser: any,
  ) {
    if (!assignPermisoDto.categoriaId) {
      throw new ForbiddenException('Debe especificar categoriaId');
    }

    const perfil = await this.prisma.perfil.findUnique({ where: { id: perfilId } });
    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(perfil.casaId)) {
      throw new ForbiddenException('No tienes acceso a este perfil');
    }

    // Verify categoria belongs to same casa
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: assignPermisoDto.categoriaId },
    });
    if (!categoria || categoria.casaId !== perfil.casaId) {
      throw new NotFoundException('Categoría no encontrada en esta casa');
    }

    return this.prisma.perfilCategoriaPermiso.upsert({
      where: {
        perfilId_categoriaId: { perfilId, categoriaId: assignPermisoDto.categoriaId },
      },
      update: {
        puedeCrear: assignPermisoDto.puedeCrear ?? false,
        puedeEditar: assignPermisoDto.puedeEditar ?? false,
        puedeEliminar: assignPermisoDto.puedeEliminar ?? false,
        puedeVer: assignPermisoDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignPermisoDto.puedeVerTransaccionesOtros ?? false,
      },
      create: {
        perfilId,
        categoriaId: assignPermisoDto.categoriaId,
        puedeCrear: assignPermisoDto.puedeCrear ?? false,
        puedeEditar: assignPermisoDto.puedeEditar ?? false,
        puedeEliminar: assignPermisoDto.puedeEliminar ?? false,
        puedeVer: assignPermisoDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignPermisoDto.puedeVerTransaccionesOtros ?? false,
      },
      include: { categoria: { select: { id: true, nombre: true } } },
    });
  }

  async assignMotivoPermiso(
    perfilId: string,
    assignPermisoDto: AssignPerfilPermisoDto,
    requestingUser: any,
  ) {
    if (!assignPermisoDto.motivoId) {
      throw new ForbiddenException('Debe especificar motivoId');
    }

    const perfil = await this.prisma.perfil.findUnique({ where: { id: perfilId } });
    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(perfil.casaId)) {
      throw new ForbiddenException('No tienes acceso a este perfil');
    }

    // Verify motivo belongs to same casa
    const motivo = await this.prisma.motivo.findUnique({
      where: { id: assignPermisoDto.motivoId },
    });
    if (!motivo || motivo.casaId !== perfil.casaId) {
      throw new NotFoundException('Motivo no encontrado en esta casa');
    }

    return this.prisma.perfilMotivoPermiso.upsert({
      where: {
        perfilId_motivoId: { perfilId, motivoId: assignPermisoDto.motivoId },
      },
      update: {
        puedeCrear: assignPermisoDto.puedeCrear ?? false,
        puedeEditar: assignPermisoDto.puedeEditar ?? false,
        puedeEliminar: assignPermisoDto.puedeEliminar ?? false,
        puedeVer: assignPermisoDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignPermisoDto.puedeVerTransaccionesOtros ?? false,
      },
      create: {
        perfilId,
        motivoId: assignPermisoDto.motivoId,
        puedeCrear: assignPermisoDto.puedeCrear ?? false,
        puedeEditar: assignPermisoDto.puedeEditar ?? false,
        puedeEliminar: assignPermisoDto.puedeEliminar ?? false,
        puedeVer: assignPermisoDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignPermisoDto.puedeVerTransaccionesOtros ?? false,
      },
      include: { motivo: { select: { id: true, nombre: true } } },
    });
  }
}