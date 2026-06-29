import {
  InvalidCredentialsError,
  InactiveAccountError,
} from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { TokenServicePort } from '../../domain/ports/token.service.port';
import type { LoginInput } from '../dtos/login.input';

export class LoginUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: LoginInput) {
    const credential = await this.credentialRepository.findByEmail(input.email);

    if (!credential) throw new InvalidCredentialsError();
    if (!credential.isActive()) throw new InactiveAccountError();

    const passwordIsValid = await this.passwordHasher.compare(
      input.password,
      credential.passwordHash,
    );
    if (!passwordIsValid) throw new InvalidCredentialsError();

    const accessToken = await this.tokenService.sign({
      sub: credential.userId,
      email: credential.email,
      roles: credential.roles,
    });

    return {
      accessToken,
      userId: credential.userId,
      email: credential.email,
      roles: credential.roles,
      status: credential.status,
    };
  }
}
