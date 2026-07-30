import { PasswordResetTokenEntity } from '../entities/password-reset-token.entity';

export type CreatePasswordResetTokenInput = {
  credentialId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface PasswordResetTokenRepositoryPort {
  create(
    data: CreatePasswordResetTokenInput,
  ): Promise<PasswordResetTokenEntity>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenEntity | null>;
  markAsUsed(id: string): Promise<void>;
}
