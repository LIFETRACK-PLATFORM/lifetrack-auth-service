import { RefreshUseCase } from './refresh.use-case';
import { InvalidRefreshTokenError } from '../../domain/exceptions/auth.errors';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import {
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';

function buildCredential(status: CredentialStatus = CredentialStatus.ACTIVE) {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      passwordHash: 'hashed-password',
      roles: [AuthRole.USER],
      status,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-1',
  );
}

function buildRefreshToken(
  overrides: {
    revokedAt?: Date | null;
    expiresAt?: Date;
  } = {},
) {
  return new RefreshTokenEntity(
    {
      credentialId: 'credential-1',
      tokenHash: 'existing-hash',
      familyId: 'family-1',
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 1000 * 60),
      revokedAt: overrides.revokedAt ?? null,
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

function createCredentialRepositoryMock() {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteStalePendingVerification: jest.fn(),
  };
}

function createTokenServiceMock() {
  return {
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

describe('RefreshUseCase', () => {
  let refreshTokenRepository: ReturnType<
    typeof createRefreshTokenRepositoryMock
  >;
  let refreshTokenService: ReturnType<typeof createRefreshTokenServiceMock>;
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let tokenService: ReturnType<typeof createTokenServiceMock>;
  let useCase: RefreshUseCase;

  beforeEach(() => {
    refreshTokenRepository = createRefreshTokenRepositoryMock();
    refreshTokenService = createRefreshTokenServiceMock();
    credentialRepository = createCredentialRepositoryMock();
    tokenService = createTokenServiceMock();

    useCase = new RefreshUseCase(
      refreshTokenRepository,
      refreshTokenService,
      credentialRepository,
      tokenService,
    );
  });

  it('rota el refresh token: revoca el anterior y emite uno nuevo con la misma familia', async () => {
    const existing = buildRefreshToken();
    refreshTokenService.hash.mockReturnValue('existing-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(existing);
    credentialRepository.findById.mockResolvedValue(buildCredential());
    refreshTokenService.generate.mockReturnValue({
      token: 'new-refresh-token',
      tokenHash: 'new-hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 1000),
    });
    refreshTokenRepository.create.mockResolvedValue(buildRefreshToken());
    tokenService.sign.mockResolvedValue('new-access-token');

    const result = await useCase.execute({ refreshToken: 'raw-token' });

    expect(refreshTokenService.generate).toHaveBeenCalledWith('family-1');
    expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(
      existing.id,
      expect.any(String),
    );
    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
  });

  it('rechaza si el refresh token no existe', async () => {
    refreshTokenService.hash.mockReturnValue('unknown-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('detecta reuso de un refresh token ya revocado y revoca toda la familia', async () => {
    const revoked = buildRefreshToken({ revokedAt: new Date() });
    refreshTokenService.hash.mockReturnValue('revoked-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(revoked);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);

    expect(refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
      'family-1',
    );
  });

  it('rechaza un refresh token expirado', async () => {
    const expired = buildRefreshToken({
      expiresAt: new Date(Date.now() - 1000),
    });
    refreshTokenService.hash.mockReturnValue('expired-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(expired);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('rechaza si la credencial asociada ya no existe o está inactiva', async () => {
    const existing = buildRefreshToken();
    refreshTokenService.hash.mockReturnValue('existing-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(existing);
    credentialRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });
});
