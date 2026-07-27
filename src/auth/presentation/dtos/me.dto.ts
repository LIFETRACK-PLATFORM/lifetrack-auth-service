import { IsString } from 'class-validator';

export class MeDto {
  @IsString()
  refreshToken: string;
}
