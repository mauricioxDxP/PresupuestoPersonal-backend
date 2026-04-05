import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  nombre: string;

  @IsIn(['ingreso', 'gasto'])
  tipo: string;
}

export class UpdateCategoriaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsIn(['ingreso', 'gasto'])
  @IsOptional()
  tipo?: string;
}
