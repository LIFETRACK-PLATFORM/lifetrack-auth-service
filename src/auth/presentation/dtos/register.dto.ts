import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';
import { AuthRole } from '../../domain/entities/credential.entity';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AuthRole, { each: true })
  roles?: AuthRole[];
}
