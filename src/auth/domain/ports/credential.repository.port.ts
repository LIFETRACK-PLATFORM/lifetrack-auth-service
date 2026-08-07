import {
  AuthRole,
  AuthProvider,
  CredentialEntity,
  CredentialStatus,
} from '../entities/credential.entity';

export type CreateCredentialInput = {
  userId: string;
  email: string;
  passwordHash: string | null;
  provider?: AuthProvider;
  providerId?: string | null;
  roles: AuthRole[];
  status: CredentialStatus;
  emailVerifiedAt?: Date | null;
};

export interface CredentialRepositoryPort {
  findByEmail(email: string): Promise<CredentialEntity | null>;
  findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<CredentialEntity | null>;
  findById(id: string): Promise<CredentialEntity | null>;
  create(data: CreateCredentialInput): Promise<CredentialEntity>;
  update(credential: CredentialEntity): Promise<void>;
  deleteStalePendingVerification(olderThan: Date): Promise<number>;
}
