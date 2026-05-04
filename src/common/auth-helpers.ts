import { ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Rol } from './types';

interface AuthUser {
  id: string;
  rol: Rol;
  casaIds: string[];
}

/**
 * Obtiene el rol del usuario en una casa específica desde UsuarioCasa.
 * Si es ADMIN global, retorna ADMIN sin consultar DB.
 */
export async function getPerCasaRol(
  prisma: PrismaClient,
  user: AuthUser,
  casaId: string,
): Promise<Rol | null> {
  // ADMIN global tiene acceso a todo
  if (user.rol === Rol.ADMIN) {
    return Rol.ADMIN;
  }

  const usuarioCasa = await prisma.usuarioCasa.findUnique({
    where: {
      usuarioId_casaId: {
        usuarioId: user.id,
        casaId,
      },
    },
    select: { rol: true },
  });

  // Map Prisma's Rol enum to our Rol enum
  if (!usuarioCasa?.rol) return null;
  return usuarioCasa.rol as unknown as Rol;
}

/**
 * Verifica que el usuario tenga rol MAESTRO_CASA en la casa especificada.
 * ADMIN global pasa automáticamente.
 * Lanza ForbiddenException si no tiene permisos.
 */
export async function requireMaestroCasaRol(
  prisma: PrismaClient,
  user: AuthUser,
  casaId: string,
  accion: string = 'realizar esta acción',
): Promise<void> {
  const rol = await getPerCasaRol(prisma, user, casaId);

  if (rol !== Rol.MAESTRO_CASA && rol !== Rol.ADMIN) {
    throw new ForbiddenException(`No tienes permisos para ${accion}`);
  }
}

/**
 * Helper para verificar si el usuario tiene acceso a una casa específica.
 * ADMIN global tiene acceso a todas.
 */
export async function hasCasaAccess(
  prisma: PrismaClient,
  user: AuthUser,
  casaId: string,
): Promise<boolean> {
  if (user.rol === Rol.ADMIN) return true;

  const rol = await getPerCasaRol(prisma, user, casaId);
  return rol === Rol.MAESTRO_CASA || rol === Rol.USUARIO; // Both have some access
}

/**
 * Verifica si el usuario tiene acceso total (ADMIN global o MAESTRO_CASA por casa).
 * Si se pasa casaId, verifica para esa casa específica.
 * Si no se pasa casaId, verifica si tiene MAESTRO_CASA en alguna de sus casas.
 */
export async function hasFullAccess(
  prisma: PrismaClient,
  user: AuthUser,
  casaId?: string,
): Promise<boolean> {
  // ADMIN global tiene acceso total
  if (user.rol === Rol.ADMIN) return true;

  if (casaId) {
    // Verificar para una casa específica
    const rol = await getPerCasaRol(prisma, user, casaId);
    return rol === Rol.MAESTRO_CASA;
  } else {
    // Verificar si tiene MAESTRO_CASA en alguna de sus casas
    for (const cid of user.casaIds) {
      const rol = await getPerCasaRol(prisma, user, cid);
      if (rol === Rol.MAESTRO_CASA) return true;
    }
    return false;
  }
}

/**
 * Obtiene todas las casas donde el usuario tiene acceso basado en UsuarioCasa.
 * Para ADMIN global retorna array vacío (significa "todas").
 */
export async function getUserCasaIdsFromDb(
  prisma: PrismaClient,
  userId: string,
): Promise<string[]> {
  const usuarioCasas = await prisma.usuarioCasa.findMany({
    where: { usuarioId: userId },
    select: { casaId: true },
  });
  return usuarioCasas.map(uc => uc.casaId);
}