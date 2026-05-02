import { IsEmail, IsString, MinLength, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { Rol } from '../../common/types';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  nombre: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsBoolean()
  @IsOptional()
  eliminado?: boolean;
}

export class AssignPermisosDto {
  @IsUUID()
  categoriaId: string;

  @IsBoolean()
  @IsOptional()
  puedeCrear?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeEditar?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeEliminar?: boolean;
}

export class AssignMotivoPermisosDto {
  @IsUUID()
  motivoId: string;

  @IsBoolean()
  @IsOptional()
  puedeCrear?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeEditar?: boolean;

  @IsBoolean()
  @IsOptional()
  puedeEliminar?: boolean;
}

export class AssignCasaDto {
  @IsUUID()
  casaId: string;

  @IsString()
  @IsOptional()
  rol?: Rol;
}