import { InvalidRefreshTokenError } from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { TokenServicePort } from '../../domain/ports/token.service.port';
import type { RefreshTokenServicePort } from '../../domain/ports/refresh-token.service.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { RefreshInput } from '../dtos/refresh.input';

export class RefreshUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly refreshTokenService: RefreshTokenServicePort,
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute(input: RefreshInput) {
    const tokenHash = this.refreshTokenService.hash(input.refreshToken);
    const existing =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existing) {
      throw new InvalidRefreshTokenError();
    }

    if (existing.isRevoked()) {
      // El token ya fue usado antes: se asume robado y se revoca toda la sesión.
      await this.refreshTokenRepository.revokeFamily(existing.familyId);
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

    const generated = this.refreshTokenService.generate(existing.familyId);
    const created = await this.refreshTokenRepository.create({
      credentialId: credential.id,
      tokenHash: generated.tokenHash,
      familyId: generated.familyId,
      expiresAt: generated.expiresAt,
    });
    await this.refreshTokenRepository.revoke(existing.id, created.id);

    const accessToken = await this.tokenService.sign({
      sub: credential.userId,
      email: credential.email,
      roles: credential.roles,
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
