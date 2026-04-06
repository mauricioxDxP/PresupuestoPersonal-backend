import { MotivosService } from './motivos.service';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';
export declare class MotivosController {
    private readonly motivosService;
    constructor(motivosService: MotivosService);
    create(createMotivoDto: CreateMotivoDto): Promise<{
        nombre: string;
        orden: number;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
    }>;
    findAll(categoriaId?: string): Promise<{
        nombre: string;
        orden: number;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
    }[]>;
    findOne(id: string): Promise<{
        nombre: string;
        orden: number;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
    }>;
    update(id: string, updateMotivoDto: UpdateMotivoDto): Promise<{
        nombre: string;
        orden: number;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
    }>;
    remove(id: string): Promise<{
        nombre: string;
        orden: number;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
    }>;
    reorder(motivos: {
        id: string;
        orden: number;
    }[]): Promise<{
        nombre: string;
        orden: number;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
    }[]>;
}
