import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, IsDateString, IsNumberString } from 'class-validator';

export class UpdateTransaccionDto {
  @IsUUID()
  @IsOptional()
  motivoId?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsNumberString()
  @IsOptional()
  monto?: string;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsBoolean()
  @IsOptional()
  facturable?: boolean;
}
