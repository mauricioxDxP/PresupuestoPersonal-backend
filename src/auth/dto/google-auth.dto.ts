import { IsString, IsUUID, IsOptional } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  googleToken: string;

  @IsUUID()
  @IsOptional()
  casaId?: string;
}