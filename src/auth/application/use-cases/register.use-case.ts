import { randomUUID } from 'crypto';
import { AuthRole } from '../../domain/entities/credential.entity';
import { EmailAlreadyExistsError } from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { EventPublisherPort } from '../../domain/ports/event.publisher.port';
import type { RegisterInput } from '../dtos/register.input';

export class RegisterUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly eventPublisher: EventPublisherPort,
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

    return {
      credentialId: credential.id,
      userId: credential.userId,
      email: credential.email,
      roles: credential.roles,
      status: credential.status,
    };
  }
}
