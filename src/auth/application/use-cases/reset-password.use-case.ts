import { createHash } from 'crypto';
import { InvalidPasswordResetTokenError } from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { PasswordResetTokenRepositoryPort } from '../../domain/ports/password-reset-token.repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { ResetPasswordInput } from '../dtos/reset-password.input';

export class ResetPasswordUseCase {
  constructor(
    private readonly passwordResetTokenRepository: PasswordResetTokenRepositoryPort,
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const resetToken =
      await this.passwordResetTokenRepository.findByTokenHash(tokenHash);

    if (!resetToken || !resetToken.isValid()) {
      throw new InvalidPasswordResetTokenError();
    }

    const credential = await this.credentialRepository.findById(
      resetToken.credentialId,
    );
    if (!credential) {
      throw new InvalidPasswordResetTokenError();
    }

    const newPasswordHash = await this.passwordHasher.hash(input.newPassword);
    credential.setPasswordHash(newPasswordHash);
    await this.credentialRepository.update(credential);

    await this.passwordResetTokenRepository.markAsUsed(resetToken.id);
    await this.refreshTokenRepository.revokeAllForCredential(credential.id);
  }
}
