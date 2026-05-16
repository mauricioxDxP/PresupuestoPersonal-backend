import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../../common/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No hay usuario autenticado');
    }

    // ADMIN global tiene acceso a todo
    if (user.rol === Rol.ADMIN) {
      return true;
    }

    // Verificar si el rol global del usuario está en los roles requeridos
    const hasRole = requiredRoles.includes(user.rol);

    if (!hasRole) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }

    return true;
  }
}