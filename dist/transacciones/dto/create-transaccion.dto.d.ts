export declare class CreateTransaccionDto {
    motivoId: string;
    categoriaId: string;
    monto: number;
    fecha: string;
    descripcion?: string;
    facturable?: boolean;
}
export declare class UpdateTransaccionDto {
    motivoId?: string;
    categoriaId?: string;
    monto?: number;
    fecha?: string;
    descripcion?: string;
    facturable?: boolean;
}
