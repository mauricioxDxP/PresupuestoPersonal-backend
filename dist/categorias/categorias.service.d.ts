import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { Categoria } from '@prisma/client';
export declare class CategoriasService {
    private logger;
    private prisma;
    constructor();
    create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria>;
    findAll(tipo?: string): Promise<Categoria[]>;
    findOne(id: string): Promise<Categoria>;
    update(id: string, updateCategoriaDto: UpdateCategoriaDto): Promise<Categoria>;
    remove(id: string): Promise<Categoria>;
}
