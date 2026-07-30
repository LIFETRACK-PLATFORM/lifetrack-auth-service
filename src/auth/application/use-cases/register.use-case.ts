import { randomUUID, randomBytes, createHash } from 'crypto';
import { AuthRole, CredentialStatus } from '../../domain/entities/credential.entity';
import { EmailAlreadyExistsError } from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { EventPublisherPort } from '../../domain/ports/event.publisher.port';
import type { EmailVerificationTokenRepositoryPort } from '../../domain/ports/email-verification-token.repository.port';
import type { EmailSenderPort } from '../../domain/ports/email-sender.port';
import type { RegisterInput } from '../dtos/register.input';

export class RegisterUseCase {
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
    if (existing) throw new EmailAlreadyExistsError(input.email);

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

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.emailVerificationTokenRepository.create({
      credentialId: credential.id,
      tokenHash,
      expiresAt: new Date(Date.now() + this.verificationTokenTtlMs),
    });

    const verifyUrl = `${this.verificationUrlBase}?token=${token}`;
    try {
      await this.emailSender.sendEmailVerification(credential.email, verifyUrl);
    } catch {
      // Un fallo del proveedor de correo no debe revertir una cuenta ya
      // creada: no hay nada que compensar, y el usuario puede reintentar
      // el flujo de recuperación más adelante (ver design.md).
    }

    return {
      credentialId: credential.id,
      userId: credential.userId,
      email: credential.email,
      roles: credential.roles,
      status: credential.status,
    };
  }
}
