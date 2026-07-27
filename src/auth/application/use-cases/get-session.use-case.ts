import { InvalidRefreshTokenError } from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { RefreshTokenServicePort } from '../../domain/ports/refresh-token.service.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { GetSessionInput } from '../dtos/get-session.input';

export class GetSessionUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly refreshTokenService: RefreshTokenServicePort,
    private readonly credentialRepository: CredentialRepositoryPort,
  ) {}

  async execute(input: GetSessionInput) {
    const tokenHash = this.refreshTokenService.hash(input.refreshToken);
    const existing =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existing) {
      throw new InvalidRefreshTokenError();
    }

    if (existing.isRevoked()) {
      throw new InvalidRefreshTokenError();
    }

    if (existing.isExpired()) {
      throw new InvalidRefreshTokenError();
    }

    const credential = await this.credentialRepository.findById(
      existing.credentialId,
    );
    if (!credential || !credential.isActive()) {
      throw new InvalidRefreshTokenError();
    }

    return {
      userId: credential.userId,
      email: credential.email,
      roles: credential.roles,
      status: credential.status,
    };
  }
}
