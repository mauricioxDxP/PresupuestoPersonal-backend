import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { Rol } from '../../common/types';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No hay usuario autenticado');
    }

    // ADMIN and MAESTRO_CASA have full access
    if (user.rol === Rol.ADMIN || user.rol === Rol.MAESTRO_CASA) {
      return true;
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