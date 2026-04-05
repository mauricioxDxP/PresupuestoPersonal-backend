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
    private buildWhereClause;
}
