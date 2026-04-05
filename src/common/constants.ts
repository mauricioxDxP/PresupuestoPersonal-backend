// Categoría tipos
export const CATEGORIA_TIPO = {
  INGRESO: 'ingreso',
  GASTO: 'gasto',
} as const;

export type CategoriaTipo = (typeof CATEGORIA_TIPO)[keyof typeof CATEGORIA_TIPO];

// Estados
export const ESTADO = {
  ACTIVO: true,
  ELIMINADO: false,
} as const;

// Paginación
export const PAGINACION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

// Ordenamiento
export const ORDEN_DEFAULT = {
  CAMPO: 'fecha',
  DIRECCION: 'desc',
} as const;

// Mensajes de error
export const MENSAJES_ERROR = {
  NO_ENCONTRADO: 'no encontrado',
  YA_EXISTE: 'ya existe',
  VALIDACION_FALLIDA: 'validación fallida',
  ERROR_INTERNO: 'error interno del servidor',
} as const;

// Formatos
export const FORMATOS = {
  FECHA: 'YYYY-MM-DD',
  FECHA_HORA: 'YYYY-MM-DDTHH:mm:ss',
} as const;
