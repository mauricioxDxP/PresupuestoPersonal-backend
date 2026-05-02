import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../../common/types';

type Action = 'crear' | 'editar' | 'eliminar';

interface AuthUser {
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
    // Get user with their role and casaIds
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId, eliminado: false },
      include: {
        casas: true,
      },
    });

    if (!usuario) {
      return false;
    }

    // ADMIN and MAESTRO_CASA have full access within their casas
    if (usuario.rol === Rol.ADMIN || usuario.rol === Rol.MAESTRO_CASA) {
      return true;
    }

    // Get casaId from the categoria being accessed
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
    });

    if (!categoria) {
      return false;
    }

    // Check if categoria belongs to one of user's casas
    const userCasaIds = usuario.casas.map(uc => uc.casaId);
    if (!userCasaIds.includes(categoria.casaId)) {
      return false;
    }

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

      // If there's a specific motivo permission, it overrides
      if (motivoPermiso) {
        return this.hasAction(motivoPermiso, action);
      }
    }

    // Check categoria permission
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
