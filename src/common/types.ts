// Tipos derivados del modelo de datos de Prisma
// Útiles para el frontend y servicios

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
