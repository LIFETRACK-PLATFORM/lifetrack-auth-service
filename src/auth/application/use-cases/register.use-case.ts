import { randomUUID, randomBytes, createHash } from 'crypto';
import { Logger } from '@nestjs/common';
import {
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';
import { EmailAlreadyExistsError } from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { EventPublisherPort } from '../../domain/ports/event.publisher.port';
import type { EmailVerificationTokenRepositoryPort } from '../../domain/ports/email-verification-token.repository.port';
import type { EmailSenderPort } from '../../domain/ports/email-sender.port';
import type { RegisterInput } from '../dtos/register.input';

export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepositoryPort,
    private readonly emailSender: EmailSenderPort,
    private readonly verificationTokenTtlMs: number,
    private readonly verificationUrlBase: string,
  ) {}

  async execute(input: RegisterInput) {
    const existing = await this.credentialRepository.findByEmail(input.email);
    if (existing && !existing.isPendingVerification()) {
      throw new EmailAlreadyExistsError(input.email);
    }

    if (existing) {
      // Reintento de registro sobre una cuenta que nunca se confirmó: en vez
      // de bloquear el email para siempre, se trata como un reenvío de
      // verificación (ver design.md - Decisión 1).
      await this.resendVerificationFor(existing);
      return {
        credentialId: existing.id,
        userId: existing.userId,
        email: existing.email,
        roles: existing.roles,
        status: existing.status,
      };
    }

    const userId = randomUUID();
    const passwordHash = await this.passwordHasher.hash(input.password);

    const credential = await this.credentialRepository.create({
      userId,
      email: input.email,
      passwordHash,
      roles: input.roles?.length ? input.roles : [AuthRole.USER],
      status: CredentialStatus.PENDING_VERIFICATION,
    });

    await this.eventPublisher.publish({
      eventType: 'auth.user_registered',
      actorId: userId,
      payload: {
        userId,
        email: credential.email,
        displayName: input.displayName,
        roles: credential.roles,
      },
    });

    await this.issueVerificationToken(credential.id, credential.email);

    return {
      credentialId: credential.id,
      userId: credential.userId,
      email: credential.email,
      roles: credential.roles,
      status: credential.status,
    };
  }

  private async resendVerificationFor(
    credential: CredentialEntity,
  ): Promise<void> {
    await this.emailVerificationTokenRepository.invalidateAllForCredential(
      credential.id,
    );
    // Marca la credencial como "con actividad reciente" para que el job de
    // limpieza (ver design.md - Decisión 4) no la borre.
    await this.credentialRepository.update(credential);
    await this.issueVerificationToken(credential.id, credential.email);
  }

  private async issueVerificationToken(
    credentialId: string,
    email: string,
  ): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.emailVerificationTokenRepository.create({
      credentialId,
      tokenHash,
      expiresAt: new Date(Date.now() + this.verificationTokenTtlMs),
    });

    const verifyUrl = `${this.verificationUrlBase}?token=${token}`;
    try {
      await this.emailSender.sendEmailVerification(email, verifyUrl);
    } catch (err) {
      // Un fallo del proveedor de correo no debe revertir una cuenta ya
      // creada: no hay nada que compensar, y el usuario puede reintentar
      // el flujo de reenvío más adelante (ver design.md). Sí se loguea,
      // porque antes este catch vacío ocultaba por completo cualquier
      // excepción real del envío (aparte del error ya logueado dentro
      // del adapter cuando Resend responde con { error }).
      this.logger.error(
        `Excepción al enviar email de verificación a ${email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
