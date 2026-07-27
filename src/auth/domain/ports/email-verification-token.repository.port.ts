import { EmailVerificationTokenEntity } from '../entities/email-verification-token.entity';

export type CreateEmailVerificationTokenInput = {
  credentialId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface EmailVerificationTokenRepositoryPort {
  create(
    data: CreateEmailVerificationTokenInput,
  ): Promise<EmailVerificationTokenEntity>;
  findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationTokenEntity | null>;
  markAsUsed(id: string): Promise<void>;
}
