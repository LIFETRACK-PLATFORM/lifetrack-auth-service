import { randomBytes, createHash } from 'crypto';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { EmailVerificationTokenRepositoryPort } from '../../domain/ports/email-verification-token.repository.port';
import type { EmailSenderPort } from '../../domain/ports/email-sender.port';
import type { ResendVerificationInput } from '../dtos/resend-verification.input';

export class ResendVerificationUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepositoryPort,
    private readonly emailSender: EmailSenderPort,
    private readonly verificationTokenTtlMs: number,
    private readonly verificationUrlBase: string,
  ) {}

  async execute(input: ResendVerificationInput): Promise<void> {
    const credential = await this.credentialRepository.findByEmail(input.email);

    // No revela si la cuenta existe ni su estado: solo se reenvía cuando hay
    // una credencial pendiente de verificación; la respuesta al llamador es
    // siempre la misma (ver AuthController / resend-verification.dto, mismo
    // patrón que ForgotPasswordUseCase).
    if (!credential || !credential.isPendingVerification()) {
      return;
    }

    await this.emailVerificationTokenRepository.invalidateAllForCredential(
      credential.id,
    );
    // Marca la credencial como "con actividad reciente" para que el job de
    // limpieza no la borre (ver design.md - Decisión 4).
    await this.credentialRepository.update(credential);

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.emailVerificationTokenRepository.create({
      credentialId: credential.id,
      tokenHash,
      expiresAt: new Date(Date.now() + this.verificationTokenTtlMs),
    });

    const verifyUrl = `${this.verificationUrlBase}?token=${token}`;
    await this.emailSender.sendEmailVerification(credential.email, verifyUrl);
  }
}
