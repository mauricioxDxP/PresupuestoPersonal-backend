import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID } from 'class-validator';

export class CreateMotivoDto {
  @IsString()
  nombre: string;

  @IsUUID()
  categoriaId: string;

  @IsBoolean()
  @IsOptional()
  mostrarSinTransacciones?: boolean;

  @IsNumber()
  @IsOptional()
  orden?: number;
}

export class UpdateMotivoDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsBoolean()
  @IsOptional()
  mostrarSinTransacciones?: boolean;

  @IsNumber()
  @IsOptional()
  orden?: number;
}
