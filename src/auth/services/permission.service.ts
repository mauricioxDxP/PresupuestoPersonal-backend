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

    // USUARIO per-casa needs to check specific permissions
    if (perCasaRol === Rol.USUARIO) {
      // If there's a motivoId, check motivo first (specific overrides general)
      if (motivoId) {
        const motivoPermiso = await this.prisma.usuarioMotivoPermiso.findUnique({
          where: {
            usuarioId_motivoId: {
              usuarioId,
              motivoId,
            },
          },
        });

        if (motivoPermiso) {
          return this.hasAction(motivoPermiso, action);
        }
      }

      // Check categoria permission (unique key is [usuarioId, categoriaId])
      const categoriaPermiso = await this.prisma.usuarioCategoriaPermiso.findUnique({
        where: {
          usuarioId_categoriaId: {
            usuarioId,
            categoriaId,
          },
        },
      });

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
}