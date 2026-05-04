import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { CreateUserDto, UpdateUserDto, AssignPermisosDto, AssignMotivoPermisosDto, AssignCasaDto } from './dto/users.dto';
import { Rol } from '../common/types';
import { getUserCasaIdsFromDb, requireMaestroCasaRol, getPerCasaRol } from '../common/auth-helpers';

interface AuthUser {
  id: string;
  rol: Rol;
  casaIds: string[];
}

@Injectable()
export class UsersService {
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  /**
   * Get user's casas (for multi-casa maestro)
   */
  async getUserCasas(userId: string): Promise<any[]> {
    const usuarioCasas = await this.prisma.usuarioCasa.findMany({
      where: { usuarioId: userId },
      include: { casa: true },
    });
    return usuarioCasas.map(uc => ({
      id: uc.casa.id,
      nombre: uc.casa.nombre,
      rol: uc.rol,
    }));
  }

  /**
   * Assign a casa to a user (maestro can manage multiple)
   */
  async assignCasa(
    usuarioId: string,
    assignCasaDto: AssignCasaDto,
    requestingUser: AuthUser,
  ) {
    // Only ADMIN or MAESTRO_CASA can assign casas
    if (requestingUser.rol !== Rol.ADMIN && requestingUser.rol !== Rol.MAESTRO_CASA) {
      throw new ForbiddenException('Solo el usuario maestro o administrador puede asignar casas');
    }

    // For MAESTRO_CASA, verify they own the target casa
    if (requestingUser.rol === Rol.MAESTRO_CASA && !requestingUser.casaIds.includes(assignCasaDto.casaId)) {
      throw new ForbiddenException('No puedes asignar una casa que no te pertenece');
    }

    // Check if user exists
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Check if relation already exists
    const existing = await this.prisma.usuarioCasa.findUnique({
      where: { usuarioId_casaId: { usuarioId, casaId: assignCasaDto.casaId } },
    });

    if (existing) {
      throw new ConflictException('El usuario ya está asignado a esta casa');
    }

    return this.prisma.usuarioCasa.create({
      data: {
        usuarioId,
        casaId: assignCasaDto.casaId,
        rol: assignCasaDto.rol || Rol.USUARIO,
      },
      include: { casa: true },
    });
  }

  /**
   * Remove a casa from a user
   */
  async removeCasa(
    usuarioId: string,
    casaId: string,
    requestingUser: AuthUser,
  ) {
    if (requestingUser.rol !== Rol.ADMIN && requestingUser.rol !== Rol.MAESTRO_CASA) {
      throw new ForbiddenException('Solo el usuario maestro o administrador puede remover casas');
    }

    if (requestingUser.rol === Rol.MAESTRO_CASA && !requestingUser.casaIds.includes(casaId)) {
      throw new ForbiddenException('No puedes remover una casa que no te pertenece');
    }

    const usuarioCasa = await this.prisma.usuarioCasa.findUnique({
      where: { usuarioId_casaId: { usuarioId, casaId } },
    });

    if (!usuarioCasa) {
      throw new NotFoundException('El usuario no está asignado a esta casa');
    }

    // Prevent removing last casa (user should always have at least one casa)
    const casaCount = await this.prisma.usuarioCasa.count({ where: { usuarioId } });
    if (casaCount <= 1) {
      throw new ForbiddenException('No puedes remover la última casa del usuario');
    }

    await this.prisma.usuarioCasa.delete({
      where: { usuarioId_casaId: { usuarioId, casaId } },
    });
  }

  async create(createUserDto: CreateUserDto, casaId: string, requestingUser: AuthUser) {
    // Only MAESTRO_CASA can create users
    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro puede crear usuarios');
    }

    // For MAESTRO_CASA, verify they own the target casa
    if (requestingUser.rol === Rol.MAESTRO_CASA && !requestingUser.casaIds.includes(casaId)) {
      throw new ForbiddenException('No puedes crear usuarios en otra casa');
    }

    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.usuario.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        nombre: createUserDto.nombre,
        rol: Rol.USUARIO,
        casas: {
          create: {
            casaId,
            rol: Rol.USUARIO,
          },
        },
      },
      include: {
        casas: { include: { casa: true } },
      },
    });

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      casas: user.casas.map(uc => ({ id: uc.casa.id, nombre: uc.casa.nombre })),
      createdAt: user.createdAt,
    };
  }

  async findAll(casaId: string, requestingUser: AuthUser) {
    if (requestingUser.rol === Rol.USUARIO) {
      throw new ForbiddenException('No tienes permisos para ver usuarios');
    }

    // ADMIN can see all users without casaId filter
    if (requestingUser.rol === Rol.ADMIN && !casaId) {
      return this.prisma.usuario.findMany({
        where: { eliminado: false },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          createdAt: true,
          eliminado: true,
          casas: {
            include: { casa: { select: { id: true, nombre: true } } },
          },
          categoriaPermisos: {
            include: { categoria: { select: { id: true, nombre: true } } },
          },
          motivoPermisos: {
            include: { motivo: { select: { id: true, nombre: true } } },
          },
        },
      });
    }

    // MAESTRO_CASA and USUARIO need a valid casaId
    if (!casaId && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Debes especificar una casa para ver usuarios');
    }

    // MAESTRO_CASA can only see users in their own casas
    if (requestingUser.rol === Rol.MAESTRO_CASA && !requestingUser.casaIds.includes(casaId)) {
      throw new ForbiddenException('No puedes ver usuarios de otra casa');
    }

    // For ADMIN with casaId filter, check it
    if (requestingUser.rol === Rol.ADMIN && casaId && !requestingUser.casaIds.includes(casaId) && requestingUser.casaIds.length > 0) {
      throw new ForbiddenException('No puedes ver usuarios de otra casa');
    }

    // Get all users that have this casaId in their UsuarioCasa relation
    return this.prisma.usuario.findMany({
      where: {
        eliminado: false,
        casas: {
          some: { casaId },
        },
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        createdAt: true,
        casas: {
          include: { casa: { select: { id: true, nombre: true } } },
        },
        categoriaPermisos: {
          include: { categoria: { select: { id: true, nombre: true } } },
        },
        motivoPermisos: {
          include: { motivo: { select: { id: true, nombre: true, categoriaId: true } } },
        },
      },
    });
  }

  async findOne(id: string, requestingUser: AuthUser) {
    const user = await this.prisma.usuario.findUnique({
      where: { id, eliminado: false },
      include: {
        casas: { include: { casa: { select: { id: true, nombre: true } } } },
        categoriaPermisos: true,
        motivoPermisos: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Users can see themselves, Maestro can see users in their casas
    if (requestingUser.rol === Rol.USUARIO && requestingUser.id !== id) {
      throw new ForbiddenException('No tienes permisos para ver este usuario');
    }

    if (requestingUser.rol === Rol.MAESTRO_CASA) {
      const userCasaIds = user.casas.map(uc => uc.casaId);
      const hasAccess = userCasaIds.some(cid => requestingUser.casaIds.includes(cid));
      if (!hasAccess) {
        throw new ForbiddenException('No tienes permisos para ver este usuario');
      }
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    requestingUser: AuthUser,
  ) {
    const user = await this.prisma.usuario.findUnique({
      where: { id, eliminado: false },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Only Maestro can update users in their casas, or user can update themselves
    if (requestingUser.rol === Rol.USUARIO && requestingUser.id !== id) {
      throw new ForbiddenException('No tienes permisos para actualizar este usuario');
    }

    if (requestingUser.rol === Rol.MAESTRO_CASA) {
      // Check if user being updated is in one of requesting user's casas
      const userCasas = await this.prisma.usuarioCasa.findMany({
        where: { usuarioId: id },
      });
      const userCasaIds = userCasas.map(uc => uc.casaId);
      const hasAccess = userCasaIds.some(cid => requestingUser.casaIds.includes(cid));
      if (!hasAccess) {
        throw new ForbiddenException('No puedes actualizar usuarios de otra casa');
      }
      if (updateUserDto.puedeEliminar !== undefined && requestingUser.id === id) {
        throw new ForbiddenException('No puedes eliminarte a ti mismo');
      }
    }

    if (requestingUser.rol === Rol.USUARIO) {
      if (requestingUser.id !== id) {
        throw new ForbiddenException('No tienes permisos para actualizar este usuario');
      }
    }

    return this.prisma.usuario.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
      },
    });
  }

  async remove(id: string, requestingUser: AuthUser) {
    const user = await this.prisma.usuario.findUnique({
      where: { id, eliminado: false },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro puede eliminar usuarios');
    }

    if (requestingUser.rol === Rol.MAESTRO_CASA) {
      const userCasas = await this.prisma.usuarioCasa.findMany({
        where: { usuarioId: id },
      });
      const userCasaIds = userCasas.map(uc => uc.casaId);
      const hasAccess = userCasaIds.some(cid => requestingUser.casaIds.includes(cid));
      if (!hasAccess) {
        throw new ForbiddenException('No puedes eliminar usuarios de otra casa');
      }
    }

    if (user.id === requestingUser.id) {
      throw new ForbiddenException('No puedes eliminarte a ti mismo');
    }

    // Soft delete
    return this.prisma.usuario.update({
      where: { id },
      data: { eliminado: true },
    });
  }

  async assignCategoriaPermiso(
    usuarioId: string,
    assignPermisosDto: AssignPermisosDto,
    requestingUser: AuthUser,
  ) {
    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro puede asignar permisos');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verify the target user belongs to one of requesting user's casas
    const usuarioCasas = await this.prisma.usuarioCasa.findMany({
      where: { usuarioId },
    });
    const usuarioCasaIds = usuarioCasas.map(uc => uc.casaId);
    const hasAccess = requestingUser.rol === Rol.ADMIN || 
      usuarioCasaIds.some(cid => requestingUser.casaIds.includes(cid));
    if (!hasAccess) {
      throw new ForbiddenException('No puedes asignar permisos a usuarios de otra casa');
    }

    // Verify categoria belongs to one of requesting user's casas
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: assignPermisosDto.categoriaId },
    });

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(categoria.casaId)) {
      throw new NotFoundException('Categoría no encontrada en tu casa');
    }

    return this.prisma.usuarioCategoriaPermiso.upsert({
      where: {
        usuarioId_categoriaId: {
          usuarioId,
          categoriaId: assignPermisosDto.categoriaId,
        },
      },
      update: {
        puedeCrear: assignPermisosDto.puedeCrear ?? false,
        puedeEditar: assignPermisosDto.puedeEditar ?? false,
        puedeEliminar: assignPermisosDto.puedeEliminar ?? false,
        puedeVer: assignPermisosDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignPermisosDto.puedeVerTransaccionesOtros ?? false,
      },
      create: {
        usuarioId,
        categoriaId: assignPermisosDto.categoriaId,
        puedeCrear: assignPermisosDto.puedeCrear ?? false,
        puedeEditar: assignPermisosDto.puedeEditar ?? false,
        puedeEliminar: assignPermisosDto.puedeEliminar ?? false,
        puedeVer: assignPermisosDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignPermisosDto.puedeVerTransaccionesOtros ?? false,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
      },
    });
  }

  /**
   * Assign a permission profile to a user for a specific casa
   */
  async assignPerfil(
    usuarioId: string,
    perfilId: string,
    casaId: string,
    requestingUser: AuthUser,
  ) {
    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro puede asignar perfiles');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verify the target user belongs to the requesting user's casas
    const usuarioCasas = await this.prisma.usuarioCasa.findMany({
      where: { usuarioId },
    });
    const usuarioCasaIds = usuarioCasas.map(uc => uc.casaId);
    const hasAccess = requestingUser.rol === Rol.ADMIN || 
      (usuarioCasaIds.includes(casaId) && requestingUser.casaIds.includes(casaId));
    if (!hasAccess) {
      throw new ForbiddenException('No puedes asignar perfiles a usuarios de otra casa');
    }

    // Verify perfil exists and belongs to the same casa
    const perfil = await this.prisma.perfil.findUnique({
      where: { id: perfilId },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }

    if (perfil.casaId !== casaId) {
      throw new ForbiddenException('El perfil no pertenece a esta casa');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(casaId)) {
      throw new ForbiddenException('No tienes acceso a esta casa');
    }

    // Check if user already has a perfil for this casa
    const existing = await this.prisma.usuarioPerfil.findFirst({
      where: { usuarioId, casaId },
    });

    if (existing) {
      // Update existing
      return this.prisma.usuarioPerfil.update({
        where: { id: existing.id },
        data: { perfilId },
        include: {
          perfil: {
            include: {
              categoriaPermisos: { include: { categoria: true } },
              motivoPermisos: { include: { motivo: true } },
            },
          },
          casa: { select: { id: true, nombre: true } },
        },
      });
    }

    // Create new
    return this.prisma.usuarioPerfil.create({
      data: { usuarioId, perfilId, casaId },
      include: {
        perfil: {
          include: {
            categoriaPermisos: { include: { categoria: true } },
            motivoPermisos: { include: { motivo: true } },
          },
        },
        casa: { select: { id: true, nombre: true } },
      },
    });
  }

  /**
   * Remove a permission profile from a user for a specific casa
   */
  async removePerfil(
    usuarioId: string,
    casaId: string,
    requestingUser: AuthUser,
  ) {
    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro puede remover perfiles');
    }

    const usuarioPerfil = await this.prisma.usuarioPerfil.findFirst({
      where: { usuarioId, casaId },
    });

    if (!usuarioPerfil) {
      throw new NotFoundException('El usuario no tiene un perfil asignado en esta casa');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(casaId)) {
      throw new ForbiddenException('No tienes acceso a esta casa');
    }

    await this.prisma.usuarioPerfil.delete({
      where: { id: usuarioPerfil.id },
    });

    return { success: true };
  }

  /**
   * Get the permission profile assigned to a user for a specific casa
   */
  async getUserPerfil(
    usuarioId: string,
    casaId: string,
    requestingUser: AuthUser,
  ) {
    // Any authenticated user can see another user's perfil if they have access
    if (requestingUser.rol === Rol.USUARIO && requestingUser.id !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para ver este perfil');
    }

    if (requestingUser.rol === Rol.MAESTRO_CASA && !requestingUser.casaIds.includes(casaId)) {
      throw new ForbiddenException('No tienes acceso a esta casa');
    }

    const usuarioPerfil = await this.prisma.usuarioPerfil.findFirst({
      where: { usuarioId, casaId },
      include: {
        perfil: {
          include: {
            categoriaPermisos: {
              include: { categoria: { select: { id: true, nombre: true, tipo: true } } },
            },
            motivoPermisos: {
              include: { motivo: { select: { id: true, nombre: true, categoriaId: true } } },
            },
          },
        },
        casa: { select: { id: true, nombre: true } },
      },
    });

    return usuarioPerfil;
  }

  async assignMotivoPermiso(
    usuarioId: string,
    assignMotivoPermisosDto: AssignMotivoPermisosDto,
    requestingUser: AuthUser,
  ) {
    if (requestingUser.rol !== Rol.MAESTRO_CASA && requestingUser.rol !== Rol.ADMIN) {
      throw new ForbiddenException('Solo el usuario maestro puede asignar permisos');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verify the target user belongs to one of requesting user's casas
    const usuarioCasas = await this.prisma.usuarioCasa.findMany({
      where: { usuarioId },
    });
    const usuarioCasaIds = usuarioCasas.map(uc => uc.casaId);
    const hasAccess = requestingUser.rol === Rol.ADMIN || 
      usuarioCasaIds.some(cid => requestingUser.casaIds.includes(cid));
    if (!hasAccess) {
      throw new ForbiddenException('No puedes asignar permisos a usuarios de otra casa');
    }

    // Verify motivo belongs to one of requesting user's casas
    const motivo = await this.prisma.motivo.findUnique({
      where: { id: assignMotivoPermisosDto.motivoId },
    });

    if (!motivo) {
      throw new NotFoundException('Motivo no encontrado');
    }

    if (requestingUser.rol !== Rol.ADMIN && !requestingUser.casaIds.includes(motivo.casaId)) {
      throw new NotFoundException('Motivo no encontrado en tu casa');
    }

    return this.prisma.usuarioMotivoPermiso.upsert({
      where: {
        usuarioId_motivoId: {
          usuarioId,
          motivoId: assignMotivoPermisosDto.motivoId,
        },
      },
      update: {
        puedeCrear: assignMotivoPermisosDto.puedeCrear ?? false,
        puedeEditar: assignMotivoPermisosDto.puedeEditar ?? false,
        puedeEliminar: assignMotivoPermisosDto.puedeEliminar ?? false,
        puedeVer: assignMotivoPermisosDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignMotivoPermisosDto.puedeVerTransaccionesOtros ?? false,
      },
      create: {
        usuarioId,
        motivoId: assignMotivoPermisosDto.motivoId,
        puedeCrear: assignMotivoPermisosDto.puedeCrear ?? false,
        puedeEditar: assignMotivoPermisosDto.puedeEditar ?? false,
        puedeEliminar: assignMotivoPermisosDto.puedeEliminar ?? false,
        puedeVer: assignMotivoPermisosDto.puedeVer ?? false,
        puedeVerTransaccionesOtros: assignMotivoPermisosDto.puedeVerTransaccionesOtros ?? false,
      },
      include: {
        motivo: { select: { id: true, nombre: true } },
      },
    });
  }

async getMyPermisos(userId: string, authUser: AuthUser, xCasaIdHeader?: string | string[]) {
    const casaIdFilter = typeof xCasaIdHeader === 'string' ? xCasaIdHeader : undefined;
    const isAdmin = String(authUser?.rol) === String(Rol.ADMIN);
    
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId, eliminado: false },
      include: {
        casas: {
          include: { casa: { select: { id: true, nombre: true } } },
        },
        categoriaPermisos: {
          include: {
            categoria: { select: { id: true, nombre: true, tipo: true, casaId: true } },
          },
        },
        motivoPermisos: {
          include: {
            motivo: { select: { id: true, nombre: true, casaId: true } },
          },
        },
      },
    });

    if (!user) return null;

    // Filter by casa if x-casa-id header is provided and user is not ADMIN
    let categoriaPermisos = user.categoriaPermisos;
    let motivoPermisos = user.motivoPermisos;
    
    if (casaIdFilter && !isAdmin) {
      categoriaPermisos = categoriaPermisos.filter(cp => cp.categoria.casaId === casaIdFilter);
      motivoPermisos = motivoPermisos.filter(mp => mp.motivo.casaId === casaIdFilter);
    }

    return {
      rol: user.rol,
      casaIds: user.casas.map(uc => uc.casaId),
      casas: user.casas.map(uc => ({ id: uc.casa.id, nombre: uc.casa.nombre })),
      categoriaPermisos,
      motivoPermisos,
    };
  }
}
