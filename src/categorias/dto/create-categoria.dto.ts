import { IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  nombre: string;

  @IsIn(['ingreso', 'gasto'])
  tipo: string;

  @IsOptional()
  orden?: number;

  @IsUUID()
  @IsOptional()
  casaId?: string;
}
