import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol } from '../../common/types';

// Decorador para roles GLOBALES (solo ADMIN global debería usarlo)
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

// Decorador para roles POR CASA (MAESTRO_CASA, USUARIO)
// Usa RolesPorCasaGuard en UseGuards
export const ROLES_POR_CASA_KEY = 'roles_por_casa';
export const RolesPorCasa = (...roles: Rol[]) => SetMetadata(ROLES_POR_CASA_KEY, roles);

// Parámetro decorator para obtener la casaId del request
// Uso: @CasaId() casaId: string
export const CasaId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.params?.casaId || request.query?.casaId || request.headers['x-casa-id'];
  },
);