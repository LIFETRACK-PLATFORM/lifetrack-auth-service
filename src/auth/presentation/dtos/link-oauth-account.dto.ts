import { IsNotEmpty, IsString } from 'class-validator';

export class LinkOAuthAccountDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  linkToken: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
