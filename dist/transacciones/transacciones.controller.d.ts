import { TransaccionesService } from './transacciones.service';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { UpdateTransaccionDto } from './dto/update-transaccion.dto';
export declare class TransaccionesController {
    private readonly transaccionesService;
    constructor(transaccionesService: TransaccionesService);
    create(createTransaccionDto: CreateTransaccionDto): Promise<{
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
    }>;
    findAll(fechaInicio?: string, fechaFin?: string, categoriaId?: string, motivoId?: string, page?: string, limit?: string): Promise<import("../common/types").PaginatedResult<{
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
    }>>;
    getReportes(): Promise<import("../common/types").Reportes>;
    findOne(id: string): Promise<{
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
    }>;
    update(id: string, updateTransaccionDto: UpdateTransaccionDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
}
