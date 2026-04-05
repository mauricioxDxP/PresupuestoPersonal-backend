import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateArchivoDto {
  @IsString()
  tipo: string;

  @IsString()
  nombre: string;

  @IsString()
  url: string;

  @IsUUID()
  transaccionId: string;
}
