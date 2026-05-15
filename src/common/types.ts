// Tipos derivados del modelo de datos de Prisma
// Útiles para el frontend y servicios

// Enums
export enum Rol {
  ADMIN = 'ADMIN',
  MAESTRO_CASA = 'MAESTRO_CASA',
  USUARIO = 'USUARIO',
}

// JWT Payload
export interface JwtPayload {
  sub: string;        // userId
  email: string;
  nombre: string;
  rol: Rol;
  casaIds: string[];  // Array de casas (vacío para ADMIN que tiene acceso a todas)
  iat?: number;
  exp?: number;
}

// Usuario autenticado (extraído del request)
export interface AuthUser {
  id: string;
  email: string;
  rol: Rol;
  casaIds: string[];
  nombre: string;
}

// Filtros para consultas
export interface CategoriaFilters {
  tipo?: 'ingreso' | 'gasto';
}

export interface MotivoFilters {
  categoriaId?: string;
}

export interface TransaccionFilters {
  fechaInicio?: string;
  fechaFin?: string;
  categoriaId?: string;
  motivoId?: string;
  moneda?: string;
  billetera?: string;
}

// Paginación
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Reordenamiento
export interface ReorderItem {
  id: string;
  orden: number;
}

// Reportes
export interface ReporteCategoria {
  nombre: string;
  tipo: string;
  total: number;
}

export interface Reportes {
  totalIngresos: number;
  totalGastos: number;
  balance: number;
  porCategoria: ReporteCategoria[];
}
