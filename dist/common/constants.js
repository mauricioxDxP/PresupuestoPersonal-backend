"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FORMATOS = exports.MENSAJES_ERROR = exports.ORDEN_DEFAULT = exports.PAGINACION = exports.ESTADO = exports.CATEGORIA_TIPO = void 0;
exports.CATEGORIA_TIPO = {
    INGRESO: 'ingreso',
    GASTO: 'gasto',
};
exports.ESTADO = {
    ACTIVO: true,
    ELIMINADO: false,
};
exports.PAGINACION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
};
exports.ORDEN_DEFAULT = {
    CAMPO: 'fecha',
    DIRECCION: 'desc',
};
exports.MENSAJES_ERROR = {
    NO_ENCONTRADO: 'no encontrado',
    YA_EXISTE: 'ya existe',
    VALIDACION_FALLIDA: 'validación fallida',
    ERROR_INTERNO: 'error interno del servidor',
};
exports.FORMATOS = {
    FECHA: 'YYYY-MM-DD',
    FECHA_HORA: 'YYYY-MM-DDTHH:mm:ss',
};
//# sourceMappingURL=constants.js.map