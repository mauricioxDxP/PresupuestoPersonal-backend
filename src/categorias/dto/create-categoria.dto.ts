import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCategoriaDto {
  @IsString()
  nombre: string;

  @IsIn(['ingreso', 'gasto'])
  tipo: string;

  @IsOptional()
  orden?: number;
}
