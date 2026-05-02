import { Injectable, Scope, Inject, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Rol } from '../types';

// Modelos que tienen campo casaId
const CASA_MODELS = ['Categoria', 'Motivo', 'Transaccion', 'Archivo'];

type CasaModel = 'Categoria' | 'Motivo' | 'Transaccion' | 'Archivo';

@Injectable({ scope: Scope.REQUEST })
export class CasaIsolationService {
  private casaIds: string[] = [];
  private rol: string | null = null;
  private selectedCasaId: string | null = null;

  constructor(@Inject(REQUEST) private request: Request) {
    const user = (request as any).user;
    
    if (user) {
      this.casaIds = user.casaIds || [];
      this.rol = user.rol;
    }
    
    // Leer el header x-casa-id si existe (enviado por frontend)
    const casaIdHeader = request.headers['x-casa-id'];
    if (casaIdHeader && typeof casaIdHeader === 'string') {
      this.selectedCasaId = casaIdHeader;
    }
  }

  /**
   * Verifica si el usuario actual puede acceder a datos de otra casa
   */
  canAccessCasa(targetCasaId: string): boolean {
    if (this.rol === Rol.ADMIN) return true;
    
    if (this.selectedCasaId) {
      return this.selectedCasaId === targetCasaId && this.casaIds.includes(targetCasaId);
    }
    
    return this.casaIds.includes(targetCasaId);
  }

  /**
   * Obtiene los casaIds del usuario actual
   */
  getCasaIds(): string[] {
    return this.casaIds;
  }

  /**
   * Obtiene la casaId seleccionada desde el header (si existe)
   */
  getSelectedCasaId(): string | null {
    return this.selectedCasaId;
  }

  /**
   * Obtiene el rol del usuario actual
   */
  getRol(): string | null {
    return this.rol;
  }

  /**
   * Indica si el usuario tiene rol ADMIN
   */
  isAdmin(): boolean {
    return this.rol === Rol.ADMIN;
  }

  /**
   * Indica si el usuario tiene rol MAESTRO_CASA
   */
  isMaestroCasa(): boolean {
    return this.rol === Rol.MAESTRO_CASA;
  }

  /**
   * Añade filtro de casaId a un where clause de Prisma
   * Si hay selectedCasaId (del header), usa solo esa casa
   */
  addCasaFilter<T extends Record<string, any>>(where: T, modelName: CasaModel): T {
    if (this.rol === Rol.ADMIN) {
      return where;
    }

    if (!CASA_MODELS.includes(modelName)) {
      return where;
    }

    if (!this.casaIds.length) {
      return { ...where, id: 'NULL_CASA_ACCESS_DENIED' };
    }

    // Si el frontend envió x-casa-id, usar solo esa casa
    if (this.selectedCasaId) {
      if (!this.casaIds.includes(this.selectedCasaId)) {
        return { ...where, id: 'CASA_NOT_AUTHORIZED' };
      }
      return {
        ...where,
        casaId: this.selectedCasaId,
      };
    }

    // Otherwise use all user's casas
    return {
      ...where,
      casaId: { in: this.casaIds },
    };
  }

  /**
   * Helper para verificar acceso a una categoría específica
   */
  async verifyCategoriaAcceso(categoriaId: string, prisma: any): Promise<boolean> {
    if (this.rol === Rol.ADMIN) return true;
    
    const categoria = await prisma.categoria.findUnique({
      where: { id: categoriaId },
      select: { casaId: true },
    });

    if (!categoria) return false;

    if (this.selectedCasaId) {
      return this.selectedCasaId === categoria.casaId && this.casaIds.includes(categoria.casaId);
    }

    return this.casaIds.includes(categoria.casaId);
  }

  /**
   * Helper para verificar acceso a un motivo específico
   */
  async verifyMotivoAcceso(motivoId: string, prisma: any): Promise<boolean> {
    if (this.rol === Rol.ADMIN) return true;
    
    const motivo = await prisma.motivo.findUnique({
      where: { id: motivoId },
      select: { casaId: true },
    });

    if (!motivo) return false;

    if (this.selectedCasaId) {
      return this.selectedCasaId === motivo.casaId && this.casaIds.includes(motivo.casaId);
    }

    return this.casaIds.includes(motivo.casaId);
  }

  /**
   * Helper para verificar acceso a una transacción específica
   */
  async verifyTransaccionAcceso(transaccionId: string, prisma: any): Promise<boolean> {
    if (this.rol === Rol.ADMIN) return true;
    
    const transaccion = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { casaId: true },
    });

    if (!transaccion) return false;

    if (this.selectedCasaId) {
      return this.selectedCasaId === transaccion.casaId && this.casaIds.includes(transaccion.casaId);
    }

    return this.casaIds.includes(transaccion.casaId);
  }
}
