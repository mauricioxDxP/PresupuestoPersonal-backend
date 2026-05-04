import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../../common/types';
import { getPerCasaRol } from '../../common/auth-helpers';

type Action = 'crear' | 'editar' | 'eliminar';

interface AuthUserForPermisos {
  id: string;
  rol: Rol;
  casaIds: string[];
}

@Injectable()
export class PermissionService {
  private prisma: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  /**
   * Get Perfil permissions for a user in a specific casa
   * Returns null if no perfil is assigned
   */
  private async getPerfilPermisos(usuarioId: string, casaId: string) {
    const usuarioPerfil = await this.prisma.usuarioPerfil.findFirst({
      where: { usuarioId, casaId },
      include: {
        perfil: {
          include: {
            categoriaPermisos: true,
            motivoPermisos: true,
          },
        },
      },
    });

    return usuarioPerfil?.perfil ?? null;
  }

  /**
   * Check permission considering Perfil first, then individual permissions
   * Perfil permissions take precedence for USUARIO role
   */
  async checkPermission(
    usuarioId: string,
    categoriaId: string,
    motivoId: string | null,
    action: Action,
  ): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
      include: {
        casas: true,
      },
    });

    if (!usuario) {
      return false;
    }

    // ADMIN global has full access
    if (usuario.rol === Rol.ADMIN) {
      return true;
    }

    // Get casaId from the categoria being accessed
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
    });

    if (!categoria) {
      return false;
    }

    // Build AuthUser-like object for getPerCasaRol
    const authUser: AuthUserForPermisos = {
      id: usuario.id,
      rol: usuario.rol as Rol,
      casaIds: usuario.casas.map(c => c.casaId),
    };

    // Check per-casa role from UsuarioCasa
    const perCasaRol = await getPerCasaRol(this.prisma, authUser, categoria.casaId);

    // MAESTRO_CASA per-casa has full access within that casa
    if (perCasaRol === Rol.MAESTRO_CASA) {
      return true;
    }

    // USUARIO per-casa: check Perfil first, then individual permissions
    if (perCasaRol === Rol.USUARIO) {
      // Get Perfil permissions if assigned
      const perfil = await this.getPerfilPermisos(usuarioId, categoria.casaId);

      // If there's a motivoId, check motivo first (specific overrides general)
      if (motivoId) {
        let motivoPermiso = null;

        if (perfil) {
          // Check Perfil Motivo permission first
          motivoPermiso = perfil.motivoPermisos.find(mp => mp.motivoId === motivoId);
        } else {
          // Fall back to individual UsuarioMotivoPermiso
          motivoPermiso = await this.prisma.usuarioMotivoPermiso.findUnique({
            where: {
              usuarioId_motivoId: {
                usuarioId,
                motivoId,
              },
            },
          });
        }

        if (motivoPermiso) {
          return this.hasAction(motivoPermiso, action);
        }
      }

      // Check categoria permission
      let categoriaPermiso = null;

      if (perfil) {
        // Check Perfil Categoria permission
        categoriaPermiso = perfil.categoriaPermisos.find(cp => cp.categoriaId === categoriaId);
      } else {
        // Fall back to individual UsuarioCategoriaPermiso
        categoriaPermiso = await this.prisma.usuarioCategoriaPermiso.findUnique({
          where: {
            usuarioId_categoriaId: {
              usuarioId,
              categoriaId,
            },
          },
        });
      }

      if (categoriaPermiso) {
        return this.hasAction(categoriaPermiso, action);
      }

      // Default: no permission
      return false;
    }

    // No role in this casa
    return false;
  }

  private hasAction(permiso: any, action: Action): boolean {
    switch (action) {
      case 'crear':
        return permiso.puedeCrear;
      case 'editar':
        return permiso.puedeEditar;
      case 'eliminar':
        return permiso.puedeEliminar;
      default:
        return false;
    }
  }

  /**
   * Verifica si el usuario puede VER la categoría/motivo (en selectors, listados, reportes)
   * Requiere puedeVer: true en AMBOS (categoria Y motivo) para que retorne true
   * Perfil permissions take precedence for USUARIO role
   */
  async checkViewPermission(
    usuarioId: string,
    categoriaId: string,
    motivoId: string | null,
  ): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
      include: { casas: true },
    });

    if (!usuario) return false;

    // ADMIN y MAESTRO_CASA ven todo
    if (usuario.rol === Rol.ADMIN) return true;

    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
    });

    if (!categoria) return false;

    const authUser: AuthUserForPermisos = {
      id: usuario.id,
      rol: usuario.rol as Rol,
      casaIds: usuario.casas.map(c => c.casaId),
    };

    const perCasaRol = await getPerCasaRol(this.prisma, authUser, categoria.casaId);

    // MAESTRO_CASA ve todo
    if (perCasaRol === Rol.MAESTRO_CASA) return true;

    // USUARIO: Get Perfil first, then check puedeVer in AMBOS (categoria y motivo)
    if (perCasaRol === Rol.USUARIO) {
      const perfil = await this.getPerfilPermisos(usuarioId, categoria.casaId);

      // Verificar puedeVer en motivo
      if (motivoId) {
        let motivoPermiso = null;

        if (perfil) {
          motivoPermiso = perfil.motivoPermisos.find(mp => mp.motivoId === motivoId);
        } else {
          motivoPermiso = await this.prisma.usuarioMotivoPermiso.findUnique({
            where: { usuarioId_motivoId: { usuarioId, motivoId } },
          });
        }

        if (!motivoPermiso?.puedeVer) return false;
      }

      // Verificar puedeVer en categoria
      let categoriaPermiso = null;

      if (perfil) {
        categoriaPermiso = perfil.categoriaPermisos.find(cp => cp.categoriaId === categoriaId);
      } else {
        categoriaPermiso = await this.prisma.usuarioCategoriaPermiso.findUnique({
          where: { usuarioId_categoriaId: { usuarioId, categoriaId } },
        });
      }

      if (!categoriaPermiso?.puedeVer) return false;

      return true;
    }

    return false;
  }

  /**
   * Verifica si el usuario puede ver transacciones CREADAS POR OTROS
   * Requiere puedeVerTransaccionesOtros: true en AMBOS (categoria Y motivo)
   * Perfil permissions take precedence for USUARIO role
   */
  async canViewOthersTransactions(
    usuarioId: string,
    categoriaId: string,
    motivoId: string | null,
  ): Promise<boolean> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
      include: { casas: true },
    });

    if (!usuario) return false;

    // ADMIN y MAESTRO_CASA ven todo
    if (usuario.rol === Rol.ADMIN) return true;

    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
    });

    if (!categoria) return false;

    const authUser: AuthUserForPermisos = {
      id: usuario.id,
      rol: usuario.rol as Rol,
      casaIds: usuario.casas.map(c => c.casaId),
    };

    const perCasaRol = await getPerCasaRol(this.prisma, authUser, categoria.casaId);

    // MAESTRO_CASA ve todo
    if (perCasaRol === Rol.MAESTRO_CASA) return true;

    // USUARIO: Get Perfil first, then check puedeVerTransaccionesOtros in AMBOS
    if (perCasaRol === Rol.USUARIO) {
      const perfil = await this.getPerfilPermisos(usuarioId, categoria.casaId);

      // Verificar en motivo
      if (motivoId) {
        let motivoPermiso = null;

        if (perfil) {
          motivoPermiso = perfil.motivoPermisos.find(mp => mp.motivoId === motivoId);
        } else {
          motivoPermiso = await this.prisma.usuarioMotivoPermiso.findUnique({
            where: { usuarioId_motivoId: { usuarioId, motivoId } },
          });
        }

        if (!motivoPermiso?.puedeVerTransaccionesOtros) return false;
      }

      // Verificar en categoria
      let categoriaPermiso = null;

      if (perfil) {
        categoriaPermiso = perfil.categoriaPermisos.find(cp => cp.categoriaId === categoriaId);
      } else {
        categoriaPermiso = await this.prisma.usuarioCategoriaPermiso.findUnique({
          where: { usuarioId_categoriaId: { usuarioId, categoriaId } },
        });
      }

      if (!categoriaPermiso?.puedeVerTransaccionesOtros) return false;

      return true;
    }

    return false;
  }
}