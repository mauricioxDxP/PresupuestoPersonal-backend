import { IsString, MinLength } from 'class-validator';

export class CreateCasaDto {
  @IsString()
  @MinLength(2)
  nombre: string;
}