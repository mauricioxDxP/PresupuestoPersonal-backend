import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Rol } from '../../common/types';
import { ROLES_POR_CASA_KEY } from '../decorators/roles.decorator';
import { getPerCasaRol } from '../../common/auth-helpers';

@Injectable()
export class RolesPorCasaGuard implements CanActivate {
  private prisma: PrismaClient;

  constructor(private reflector: Reflector) {
    const connectionString = process.env.DATABASE_URL || '';
    this.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_POR_CASA_KEY, [
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

    // Extraer casaId del request
    const casaId = request.params?.casaId || request.query?.casaId || request.headers['x-casa-id'];

    if (casaId) {
      const perCasaRol = await getPerCasaRol(this.prisma, user, casaId);
      if (!requiredRoles.includes(perCasaRol)) {
        throw new ForbiddenException('No tienes permisos para realizar esta acción');
      }
      return true;
    }

    // Si no hay casaId, verificar en todas sus casas
    for (const cid of user.casaIds) {
      const perCasaRol = await getPerCasaRol(this.prisma, user, cid);
      if (requiredRoles.includes(perCasaRol)) {
        return true;
      }
    }

    throw new ForbiddenException('No tienes permisos para realizar esta acción');
  }
}