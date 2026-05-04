import { IsString, IsOptional, IsUUID, IsBoolean, IsArray } from 'class-validator';

export class CreatePerfilDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  casaId: string;
}

export class UpdatePerfilDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class AssignPerfilPermisoDto {
  @IsUUID()
  categoriaId?: string;

  @IsUUID()
  motivoId?: string;

  @IsBoolean()
  @IsOptional()
  puedeCrear?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeEditar?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeEliminar?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeVer?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeVerTransaccionesOtros?: boolean;
}

export class AssignPerfilDto {
  @IsUUID()
  perfilId: string;
}

export class AssignMultiplePermisosDto {
  @IsArray()
  permisos: AssignPerfilPermisoDto[];
}