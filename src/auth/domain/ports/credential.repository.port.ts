import {
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../entities/credential.entity';

export type CreateCredentialInput = {
  userId: string;
  email: string;
  passwordHash: string;
  roles: AuthRole[];
  status: CredentialStatus;
};

export interface CredentialRepositoryPort {
  findByEmail(email: string): Promise<CredentialEntity | null>;
  findById(id: string): Promise<CredentialEntity | null>;
  create(data: CreateCredentialInput): Promise<CredentialEntity>;
  update(credential: CredentialEntity): Promise<void>;
}
