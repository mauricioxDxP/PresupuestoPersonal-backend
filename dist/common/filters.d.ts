import { Categoria, Motivo, Transaccion } from '@prisma/client';
export type { Categoria, Motivo, Transaccion };
export interface CategoriaFilters {
    tipo?: string;
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
export interface ReorderMotivos {
    id: string;
    orden: number;
}
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
