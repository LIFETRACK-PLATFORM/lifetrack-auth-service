import { createHash } from 'crypto';
import { InvalidEmailVerificationTokenError } from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { EmailVerificationTokenRepositoryPort } from '../../domain/ports/email-verification-token.repository.port';
import type { ConfirmEmailInput } from '../dtos/confirm-email.input';

export class ConfirmEmailUseCase {
  constructor(
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepositoryPort,
    private readonly credentialRepository: CredentialRepositoryPort,
  ) {}

  async execute(input: ConfirmEmailInput): Promise<void> {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const verificationToken =
      await this.emailVerificationTokenRepository.findByTokenHash(tokenHash);

    if (!verificationToken || !verificationToken.isValid()) {
      throw new InvalidEmailVerificationTokenError();
    }

    const credential = await this.credentialRepository.findById(
      verificationToken.credentialId,
    );
    if (!credential) {
      throw new InvalidEmailVerificationTokenError();
    }

    credential.markEmailVerified();
    await this.credentialRepository.update(credential);

    await this.emailVerificationTokenRepository.markAsUsed(
      verificationToken.id,
    );
  }
}
