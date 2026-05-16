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
  rolesPorCasa?: Record<string, Rol>;
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
    // Only ADMIN global can assign casas without per-casa check
    if (requestingUser.rol !== Rol.ADMIN) {
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, assignCasaDto.casaId);
      if (perCasaRol !== Rol.MAESTRO_CASA) {
        throw new ForbiddenException('Solo el usuario maestro o administrador puede asignar casas');
      }
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
    if (requestingUser.rol !== Rol.ADMIN) {
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, casaId);
      if (perCasaRol !== Rol.MAESTRO_CASA) {
        throw new ForbiddenException('Solo el usuario maestro o administrador puede remover casas');
      }
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
    if (requestingUser.rol !== Rol.ADMIN) {
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, casaId);
      if (perCasaRol !== Rol.MAESTRO_CASA) {
        throw new ForbiddenException('Solo el usuario maestro puede crear usuarios');
      }
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
    // ADMIN global can see all without casaId filter
    if (requestingUser.rol === Rol.ADMIN && !casaId) {
      const usuarios = await this.prisma.usuario.findMany({
        where: { eliminado: false },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          createdAt: true,
          eliminado: true,
          casas: {
            include: {
              casa: true,
            },
          },
          categoriaPermisos: {
            include: {
              categoria: { select: { id: true, nombre: true } },
            },
          },
          motivoPermisos: {
            include: {
              motivo: { select: { id: true, nombre: true } },
            },
          },
        },
      });
      
      return usuarios.map(u => ({
        ...u,
        casas: u.casas.map(uc => ({
          id: uc.id,
          rol: uc.rol,
          casa: { id: uc.casa.id, nombre: uc.casa.nombre },
        })),
      }));
    }

    // Need casaId for MAESTRO_CASA or ADMIN with filter
    if (!casaId) {
      throw new ForbiddenException('Debes especificar una casa para ver usuarios');
    }

    // Check per-casa rol using UsuarioCasa, not global rol
    const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, casaId);
    
    // Only MAESTRO_CASA or ADMIN per-casa can see users
    if (perCasaRol !== Rol.MAESTRO_CASA && perCasaRol !== Rol.ADMIN) {
      throw new ForbiddenException('No tienes permisos para ver usuarios de esta casa');
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
    if (requestingUser.rol === Rol.ADMIN) {
      // Allow
    } else if (requestingUser.id === id) {
      // Users can always see themselves
    } else {
      // Check if requesting user has access to any of target user's casas
      const requestingUserCasaIds = requestingUser.casaIds || [];
      const targetUserCasaIds = user.casas.map(uc => uc.casaId);
      const hasAccess = targetUserCasaIds.some(cid => requestingUserCasaIds.includes(cid));
      if (!hasAccess) {
        // Check if user has MAESTRO_CASA in any shared casa
        let isMaestroInSharedCasa = false;
        for (const cid of requestingUserCasaIds) {
          if (targetUserCasaIds.includes(cid)) {
            const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, cid);
            if (perCasaRol === Rol.MAESTRO_CASA) {
              isMaestroInSharedCasa = true;
              break;
            }
          }
        }
        if (!isMaestroInSharedCasa) {
          throw new ForbiddenException('No tienes permisos para ver este usuario');
        }
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

    // Only ADMIN can update other users. User can update themselves
    if (requestingUser.rol === Rol.ADMIN) {
      // Allow
    } else if (requestingUser.id === id) {
      // User can update themselves
    } else {
      throw new ForbiddenException('No tienes permisos para actualizar este usuario');
    }

    // MAESTRO_CASA by casa check for usuarios in their casas
    if (requestingUser.rol !== Rol.ADMIN) {
      const userCasas = await this.prisma.usuarioCasa.findMany({
        where: { usuarioId: id },
      });
      const targetCasaIds = userCasas.map(uc => uc.casaId);
      const requestingCasaIds = requestingUser.casaIds || [];

      // Check if there's a shared casa where requesting user is MAESTRO_CASA
      let isMaestroInSharedCasa = false;
      for (const cid of requestingCasaIds) {
        if (targetCasaIds.includes(cid)) {
          const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, cid);
          if (perCasaRol === Rol.MAESTRO_CASA) {
            isMaestroInSharedCasa = true;
            break;
          }
        }
      }

      if (!isMaestroInSharedCasa) {
        throw new ForbiddenException('No puedes actualizar usuarios de otra casa');
      }

      if (updateUserDto.puedeEliminar !== undefined && requestingUser.id === id) {
        throw new ForbiddenException('No puedes eliminarte a ti mismo');
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

    if (requestingUser.rol !== Rol.ADMIN) {
      const userCasas = await this.prisma.usuarioCasa.findMany({
        where: { usuarioId: id },
      });
      // Check if requesting user has MAESTRO_CASA role in any of the target user's casas
      let hasAccess = false;
      for (const uc of userCasas) {
        const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, uc.casaId);
        if (perCasaRol === Rol.MAESTRO_CASA) {
          hasAccess = true;
          break;
        }
      }
      if (!hasAccess) {
        throw new ForbiddenException('Solo el usuario maestro puede eliminar usuarios');
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
    // Verify categoria belongs to one of requesting user's casas
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: assignPermisosDto.categoriaId },
    });

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (requestingUser.rol !== Rol.ADMIN) {
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, categoria.casaId);
      if (perCasaRol !== Rol.MAESTRO_CASA) {
        throw new ForbiddenException('No tienes permisos para asignar permisos en esta casa');
      }
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
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
    if (requestingUser.rol !== Rol.ADMIN) {
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, casaId);
      if (perCasaRol !== Rol.MAESTRO_CASA) {
        throw new ForbiddenException('Solo el usuario maestro puede asignar perfiles');
      }
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
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
    if (requestingUser.rol !== Rol.ADMIN) {
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, casaId);
      if (perCasaRol !== Rol.MAESTRO_CASA) {
        throw new ForbiddenException('Solo el usuario maestro puede remover perfiles');
      }
    }

    const usuarioPerfil = await this.prisma.usuarioPerfil.findFirst({
      where: { usuarioId, casaId },
    });

    if (!usuarioPerfil) {
      throw new NotFoundException('El usuario no tiene un perfil asignado en esta casa');
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
    // Check access: ADMIN global, or MAESTRO_CASA/USUARIO in the same casa can view
    if (requestingUser.rol !== Rol.ADMIN && requestingUser.id !== usuarioId) {
      // Check if requesting user has access to this casa
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, casaId);
      if (!perCasaRol) {
        throw new ForbiddenException('No tienes acceso a esta casa');
      }
      // MAESTRO_CASA and USUARIO in same casa can view other users' perfils
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
    // Verify motivo belongs to one of requesting user's casas
    const motivo = await this.prisma.motivo.findUnique({
      where: { id: assignMotivoPermisosDto.motivoId },
    });

    if (!motivo) {
      throw new NotFoundException('Motivo no encontrado');
    }

    if (requestingUser.rol !== Rol.ADMIN) {
      const perCasaRol = await getPerCasaRol(this.prisma, requestingUser, motivo.casaId);
      if (perCasaRol !== Rol.MAESTRO_CASA) {
        throw new ForbiddenException('No tienes permisos para asignar permisos en esta casa');
      }
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
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
      rol: casaIdFilter 
        ? (user.casas.find(uc => uc.casaId === casaIdFilter)?.rol || user.rol)
        : user.rol,
      casaIds: user.casas.map(uc => uc.casaId),
      casas: user.casas.map(uc => ({ id: uc.casa.id, nombre: uc.casa.nombre, rol: uc.rol })),
      categoriaPermisos,
      motivoPermisos,
    };
  }
}
