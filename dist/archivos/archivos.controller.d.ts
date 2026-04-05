import { ArchivosService } from './archivos.service';
export declare class ArchivosController {
    private readonly archivosService;
    constructor(archivosService: ArchivosService);
    upload(file: Express.Multer.File, transaccionId: string): Promise<{
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        transaccionId: string;
    }>;
    findAll(transaccionId?: string): Promise<({
        transaccion: {
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
        };
    } & {
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        transaccionId: string;
    })[]>;
    findOne(id: string): Promise<{
        transaccion: {
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
        };
    } & {
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        transaccionId: string;
    }>;
    remove(id: string): Promise<{
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        url: string;
        transaccionId: string;
    }>;
}
