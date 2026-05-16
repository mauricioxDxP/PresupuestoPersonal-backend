import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PermissionService } from '../services/permission.service';
import { Rol } from '../../common/types';
import { getPerCasaRol } from '../../common/auth-helpers';

@Injectable()
export class PermissionGuard implements CanActivate {
  private prisma: PrismaClient;

  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No hay usuario autenticado');
    }

    // ADMIN global tiene acceso total
    if (user.rol === Rol.ADMIN) {
      return true;
    }

    // Extraer casaId del request
    const casaId = request.params?.casaId || request.query?.casaId || request.headers['x-casa-id'];

    if (casaId) {
      const perCasaRol = await getPerCasaRol(this.prisma, user, casaId);
      // MAESTRO_CASA por casa tiene acceso total a transacciones
      if (perCasaRol === Rol.MAESTRO_CASA) {
        return true;
      }
    } else {
      // Sin casaId, verificar si tiene MAESTRO_CASA en alguna casa
      for (const cid of user.casaIds) {
        const perCasaRol = await getPerCasaRol(this.prisma, user, cid);
        if (perCasaRol === Rol.MAESTRO_CASA) {
          return true;
        }
      }
    }

    // Get the action from the decorator or default to 'crear'
    const action = this.reflector.get<string>('action', context.getHandler()) || 'crear';

    // Get categoriaId and motivoId from request
    const { categoriaId, motivoId } = request.body || request.query || {};

    if (!categoriaId) {
      // If no categoriaId is provided, allow the request (might be a different type of operation)
      return true;
    }

    const hasPermission = await this.permissionService.checkPermission(
      user.id,
      categoriaId,
      motivoId || null,
      action as 'crear' | 'editar' | 'eliminar',
    );

    if (!hasPermission) {
      throw new ForbiddenException(`No tienes permisos para ${action} en esta categoría`);
    }

    return true;
  }
}