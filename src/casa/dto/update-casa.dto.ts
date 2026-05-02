import { IsString, IsOptional } from 'class-validator';

export class UpdateCasaDto {
  @IsOptional()
  @IsString()
  nombre?: string;
}