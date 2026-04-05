export declare const CATEGORIA_TIPO: {
    readonly INGRESO: "ingreso";
    readonly GASTO: "gasto";
};
export type CategoriaTipo = (typeof CATEGORIA_TIPO)[keyof typeof CATEGORIA_TIPO];
export declare const ESTADO: {
    readonly ACTIVO: true;
    readonly ELIMINADO: false;
};
export declare const PAGINACION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 50;
    readonly MAX_LIMIT: 100;
};
export declare const ORDEN_DEFAULT: {
    readonly CAMPO: "fecha";
    readonly DIRECCION: "desc";
};
export declare const MENSAJES_ERROR: {
    readonly NO_ENCONTRADO: "no encontrado";
    readonly YA_EXISTE: "ya existe";
    readonly VALIDACION_FALLIDA: "validación fallida";
    readonly ERROR_INTERNO: "error interno del servidor";
};
export declare const FORMATOS: {
    readonly FECHA: "YYYY-MM-DD";
    readonly FECHA_HORA: "YYYY-MM-DDTHH:mm:ss";
};
