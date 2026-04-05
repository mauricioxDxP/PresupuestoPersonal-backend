import { CreateMotivoDto } from './dto/create-motivo.dto';
import { UpdateMotivoDto } from './dto/update-motivo.dto';
import { Motivo } from '@prisma/client';
import { ReorderItem } from '../common/types';
export declare class MotivosService {
    private logger;
    private prisma;
    constructor();
    create(createMotivoDto: CreateMotivoDto): Promise<Motivo>;
    findAll(categoriaId?: string): Promise<Motivo[]>;
    findOne(id: string): Promise<Motivo>;
    update(id: string, updateMotivoDto: UpdateMotivoDto): Promise<Motivo>;
    remove(id: string): Promise<Motivo>;
    reorder(motivos: ReorderItem[]): Promise<Motivo[]>;
}
