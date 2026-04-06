import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
import { Transaccion } from '@prisma/client';
import { Reportes, TransaccionFilters, PaginationParams, PaginatedResult } from '../common/types';
export declare class TransaccionesService {
    private logger;
    private prisma;
    constructor();
    create(createTransaccionDto: CreateTransaccionDto): Promise<Transaccion>;
    findAll(filtros?: TransaccionFilters, pagination?: PaginationParams): Promise<PaginatedResult<Transaccion>>;
    findOne(id: string): Promise<Transaccion>;
    update(id: string, updateTransaccionDto: UpdateTransaccionDto): Promise<Transaccion>;
    remove(id: string): Promise<Transaccion>;
    getReportes(): Promise<Reportes>;
    getReporteMensual(anio: number, mes: number): Promise<{
        transacciones: ({
            categoria: {
                nombre: string;
                tipo: string;
                orden: number;
                id: string;
                eliminado: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
            motivo: {
                nombre: string;
                orden: number;
                id: string;
                eliminado: boolean;
                createdAt: Date;
                updatedAt: Date;
                categoriaId: string;
                mostrarSinTransacciones: boolean;
            };
        } & {
            id: string;
            eliminado: boolean;
            createdAt: Date;
            updatedAt: Date;
            categoriaId: string;
            motivoId: string;
            monto: import("@prisma/client-runtime-utils").Decimal;
            fecha: Date;
            descripcion: string | null;
            facturable: boolean;
        })[];
        categorias: {
            nombre: string;
            tipo: string;
            orden: number;
            id: string;
            eliminado: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        motivos: {
            nombre: string;
            orden: number;
            id: string;
            eliminado: boolean;
            createdAt: Date;
            updatedAt: Date;
            categoriaId: string;
            mostrarSinTransacciones: boolean;
        }[];
        anio: number;
        mes: number;
        nombreMes: string;
    }>;
    private buildWhereClause;
}
