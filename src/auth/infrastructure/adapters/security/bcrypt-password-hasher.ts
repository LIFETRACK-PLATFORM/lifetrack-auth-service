import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasherPort } from '../../../domain/ports/password-hasher.port';
import { envs } from '../../../../config/envs';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  private readonly saltRounds = envs.bcryptSaltRounds;

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
