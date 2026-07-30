import {
  InvalidCredentialsError,
  InactiveAccountError,
  AccountLockedError,
  EmailNotVerifiedError,
} from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { TokenServicePort } from '../../domain/ports/token.service.port';
import type { RefreshTokenServicePort } from '../../domain/ports/refresh-token.service.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { LoginInput } from '../dtos/login.input';

// Hash bcrypt de un valor arbitrario, usado para mantener el tiempo de
// respuesta constante cuando el email no existe (evita enumeración por timing).
const DUMMY_PASSWORD_HASH =
  '$2b$12$rTG6.Buk/81aSlbYwxH2tOHHs6b.TMfB9VDFkDAxdnQuPiEnC3Pne';

export class LoginUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenService: RefreshTokenServicePort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly maxLoginAttempts: number,
    private readonly loginLockoutDurationMs: number,
  ) {}

  async execute(input: LoginInput) {
    const credential = await this.credentialRepository.findByEmail(input.email);

    if (credential?.isLocked()) {
      throw new AccountLockedError();
    }

    const passwordIsValid = await this.passwordHasher.compare(
      input.password,
      credential?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!credential || !passwordIsValid) {
      if (credential) {
        credential.registerFailedAttempt(
          this.maxLoginAttempts,
          this.loginLockoutDurationMs,
        );
        await this.credentialRepository.update(credential);
      }
      throw new InvalidCredentialsError();
    }
    if (credential.isPendingVerification()) {
      throw new EmailNotVerifiedError();
    }
    if (!credential.isActive()) {
      throw new InactiveAccountError();
    }

    credential.resetFailedAttempts();
    await this.credentialRepository.update(credential);

    const accessToken = await this.tokenService.sign({
      sub: credential.userId,
      email: credential.email,
      roles: credential.roles,
    });

    const generated = this.refreshTokenService.generate();
    await this.refreshTokenRepository.create({
      credentialId: credential.id,
      tokenHash: generated.tokenHash,
      familyId: generated.familyId,
      expiresAt: generated.expiresAt,
    });

    return {
      accessToken,
      refreshToken: generated.token,
      userId: credential.userId,
      email: credential.email,
      roles: credential.roles,
      status: credential.status,
    };
  }
}
