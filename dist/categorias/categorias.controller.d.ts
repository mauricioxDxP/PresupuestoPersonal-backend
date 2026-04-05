import { CategoriasService } from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
export declare class CategoriasController {
    private readonly categoriasService;
    constructor(categoriasService: CategoriasService);
    test(): {
        id: string;
        nombre: string;
        tipo: string;
    }[];
    create(createCategoriaDto: CreateCategoriaDto): Promise<{
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(tipo?: string): Promise<{
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateCategoriaDto: UpdateCategoriaDto): Promise<{
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        nombre: string;
        tipo: string;
        id: string;
        eliminado: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
