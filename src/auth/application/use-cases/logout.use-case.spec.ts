import { LogoutUseCase } from './logout.use-case';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';

function buildRefreshToken(revokedAt: Date | null = null) {
  return new RefreshTokenEntity(
    {
      credentialId: 'credential-1',
      tokenHash: 'existing-hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 1000 * 60),
      revokedAt,
      createdAt: new Date(),
    },
    'refresh-token-1',
  );
}

function createRefreshTokenRepositoryMock() {
  return {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    revoke: jest.fn(),
    revokeFamily: jest.fn(),
    revokeAllForCredential: jest.fn(),
  };
}

function createRefreshTokenServiceMock() {
  return {
    generate: jest.fn(),
    hash: jest.fn(),
  };
}

describe('LogoutUseCase', () => {
  let refreshTokenRepository: ReturnType<
    typeof createRefreshTokenRepositoryMock
  >;
  let refreshTokenService: ReturnType<typeof createRefreshTokenServiceMock>;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    refreshTokenRepository = createRefreshTokenRepositoryMock();
    refreshTokenService = createRefreshTokenServiceMock();

    useCase = new LogoutUseCase(refreshTokenRepository, refreshTokenService);
  });

  it('revoca el refresh token asociado a la sesión', async () => {
    const existing = buildRefreshToken();
    refreshTokenService.hash.mockReturnValue('existing-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(existing);

    await useCase.execute({ refreshToken: 'raw-token' });

    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(existing.id);
  });

  it('no lanza error si el token ya no existe (logout idempotente)', async () => {
    refreshTokenService.hash.mockReturnValue('unknown-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).resolves.toBeUndefined();
    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });

  it('no vuelve a revocar un token que ya estaba revocado', async () => {
    const alreadyRevoked = buildRefreshToken(new Date());
    refreshTokenService.hash.mockReturnValue('existing-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(alreadyRevoked);

    await useCase.execute({ refreshToken: 'raw-token' });

    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });
});
