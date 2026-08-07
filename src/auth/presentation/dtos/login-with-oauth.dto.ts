import { IsNotEmpty, IsString } from 'class-validator';

export class LoginWithOAuthDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  codeVerifier: string;
}
