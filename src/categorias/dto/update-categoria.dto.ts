import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateCategoriaDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsIn(['ingreso', 'gasto'])
  @IsOptional()
  tipo?: string;

  @IsOptional()
  orden?: number;
}
