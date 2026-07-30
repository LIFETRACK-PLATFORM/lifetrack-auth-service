import { randomBytes, createHash } from 'crypto';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { PasswordResetTokenRepositoryPort } from '../../domain/ports/password-reset-token.repository.port';
import type { EmailSenderPort } from '../../domain/ports/email-sender.port';
import type { ForgotPasswordInput } from '../dtos/forgot-password.input';

export class ForgotPasswordUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepositoryPort,
    private readonly emailSender: EmailSenderPort,
    private readonly tokenTtlMs: number,
    private readonly resetUrlBase: string,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    const credential = await this.credentialRepository.findByEmail(input.email);

    // No revela si la cuenta existe: solo se genera token y se envía email
    // cuando sí hay una credencial asociada; la respuesta al llamador es
    // siempre la misma (ver AuthController / forgot-password.dto).
    if (!credential) {
      return;
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.passwordResetTokenRepository.create({
      credentialId: credential.id,
      tokenHash,
      expiresAt: new Date(Date.now() + this.tokenTtlMs),
    });

    const resetUrl = `${this.resetUrlBase}?token=${token}`;
    await this.emailSender.sendPasswordReset(credential.email, resetUrl);
  }
}
