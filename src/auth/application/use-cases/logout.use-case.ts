import type { RefreshTokenServicePort } from '../../domain/ports/refresh-token.service.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { LogoutInput } from '../dtos/logout.input';

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly refreshTokenService: RefreshTokenServicePort,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const tokenHash = this.refreshTokenService.hash(input.refreshToken);
    const existing =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existing || existing.isRevoked()) {
      return;
    }

    await this.refreshTokenRepository.revoke(existing.id);
  }
}
