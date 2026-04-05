import { Categoria, Motivo, Transaccion } from '@prisma/client';

export type { Categoria, Motivo, Transaccion };

// Tipos de filtro para categorías
export interface CategoriaFilters {
  tipo?: string;
}

// Tipos de filtro para motivos
export interface MotivoFilters {
  categoriaId?: string;
}

// Tipos de filtro para transacciones
export interface TransaccionFilters {
  fechaInicio?: string;
  fechaFin?: string;
  categoriaId?: string;
  motivoId?: string;
}

// Reordenamiento de motivos
export interface ReorderMotivos {
  id: string;
  orden: number;
}

// Reporte por categoría
export interface ReporteCategoria {
  nombre: string;
  tipo: string;
  total: number;
}

// Reporte completo
export interface Reportes {
  totalIngresos: number;
  totalGastos: number;
  balance: number;
  porCategoria: ReporteCategoria[];
}
