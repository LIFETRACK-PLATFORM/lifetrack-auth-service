import { GetSessionUseCase } from './get-session.use-case';
import { InvalidRefreshTokenError } from '../../domain/exceptions/auth.errors';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import {
  AuthRole,
  AuthProvider,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';

function buildCredential(status: CredentialStatus = CredentialStatus.ACTIVE) {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      passwordHash: 'hashed-password',
      provider: AuthProvider.LOCAL,
      providerId: null,
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

describe('GetSessionUseCase', () => {
  let refreshTokenRepository: ReturnType<
    typeof createRefreshTokenRepositoryMock
  >;
  let refreshTokenService: ReturnType<typeof createRefreshTokenServiceMock>;
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let useCase: GetSessionUseCase;

  beforeEach(() => {
    refreshTokenRepository = createRefreshTokenRepositoryMock();
    refreshTokenService = createRefreshTokenServiceMock();
    credentialRepository = createCredentialRepositoryMock();

    useCase = new GetSessionUseCase(
      refreshTokenRepository,
      refreshTokenService,
      credentialRepository,
    );
  });

  it('devuelve los datos del usuario cuando el refresh token es válido', async () => {
    const existing = buildRefreshToken();
    refreshTokenService.hash.mockReturnValue('existing-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(existing);
    credentialRepository.findById.mockResolvedValue(buildCredential());

    const result = await useCase.execute({ refreshToken: 'raw-token' });

    expect(result).toEqual({
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      roles: [AuthRole.USER],
      status: CredentialStatus.ACTIVE,
    });
    expect(refreshTokenService.generate).not.toHaveBeenCalled();
    expect(refreshTokenRepository.create).not.toHaveBeenCalled();
    expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
  });

  it('rechaza si el refresh token no existe', async () => {
    refreshTokenService.hash.mockReturnValue('unknown-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);
  });

  it('rechaza un refresh token ya revocado sin revocar la familia', async () => {
    const revoked = buildRefreshToken({ revokedAt: new Date() });
    refreshTokenService.hash.mockReturnValue('revoked-hash');
    refreshTokenRepository.findByTokenHash.mockResolvedValue(revoked);

    await expect(
      useCase.execute({ refreshToken: 'raw-token' }),
    ).rejects.toThrow(InvalidRefreshTokenError);

    expect(refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
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
