import { AuthRole, CredentialEntity } from '../entities/credential.entity';

export type CreateCredentialInput = {
  userId: string;
  email: string;
  passwordHash: string;
  roles: AuthRole[];
};

export interface CredentialRepositoryPort {
  findByEmail(email: string): Promise<CredentialEntity | null>;
  create(data: CreateCredentialInput): Promise<CredentialEntity>;
}
