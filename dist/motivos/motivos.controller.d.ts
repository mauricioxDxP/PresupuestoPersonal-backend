import { MotivosService } from './motivos.service';
import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';
export declare class MotivosController {
    private readonly motivosService;
    constructor(motivosService: MotivosService);
    create(createMotivoDto: CreateMotivoDto): Promise<{
        nombre: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
        orden: number;
    }>;
    findAll(categoriaId?: string): Promise<{
        nombre: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
        orden: number;
    }[]>;
    findOne(id: string): Promise<{
        nombre: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
        orden: number;
    }>;
    update(id: string, updateMotivoDto: UpdateMotivoDto): Promise<{
        nombre: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
        orden: number;
    }>;
    remove(id: string): Promise<{
        nombre: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
        orden: number;
    }>;
    reorder(motivos: {
        id: string;
        orden: number;
    }[]): Promise<{
        nombre: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
        categoriaId: string;
        mostrarSinTransacciones: boolean;
        orden: number;
    }[]>;
}
