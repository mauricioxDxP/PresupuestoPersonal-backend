import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsDateString } from 'class-validator';

export class CreateTransaccionDto {
  @IsUUID()
  motivoId: string;

  @IsUUID()
  categoriaId: string;

  @IsNumber()
  @IsOptional()
  monto?: number;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  facturable?: boolean;

  @IsUUID()
  @IsOptional()
  casaId?: string;
}

export class UpdateTransaccionDto {
  @IsUUID()
  @IsOptional()
  motivoId?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsNumber()
  @IsOptional()
  monto?: number;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  facturable?: boolean;

  @IsUUID()
  @IsOptional()
  casaId?: string;
}
