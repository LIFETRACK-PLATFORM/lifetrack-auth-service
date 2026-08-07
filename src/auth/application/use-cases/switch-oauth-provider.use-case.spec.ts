import { SwitchOAuthProviderUseCase } from './switch-oauth-provider.use-case';
import {
  AuthProvider,
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import {
  InactiveAccountError,
  InvalidRefreshTokenError,
  OAuthEmailMismatchError,
  OAuthIdentityAlreadyLinkedError,
} from '../../domain/exceptions/auth.errors';
import type { OAuthProfile } from '../../domain/ports/oauth-provider.port';

function buildCredential(
  overrides: Partial<{
    provider: AuthProvider;
    providerId: string | null;
    email: string;
    status: CredentialStatus;
  }> = {},
) {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: overrides.email ?? 'ana@example.com',
      passwordHash: null,
      provider: overrides.provider ?? AuthProvider.GITHUB,
      providerId: overrides.providerId ?? 'github-sub-1',
      roles: [AuthRole.USER],
      status: overrides.status ?? CredentialStatus.ACTIVE,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-1',
  );
}

function buildRefreshToken(
  overrides: Partial<{
    credentialId: string;
    revokedAt: Date | null;
    expiresAt: Date;
  }> = {},
) {
  return new RefreshTokenEntity(
    {
      credentialId: overrides.credentialId ?? 'credential-1',
      tokenHash: 'refresh-hash',
      familyId: 'family-1',
      revokedAt: overrides.revokedAt ?? null,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000),
      createdAt: new Date(),
    },
    'refresh-token-1',
  );
}

describe('SwitchOAuthProviderUseCase', () => {
  const googleProfile: OAuthProfile = {
    provider: AuthProvider.GOOGLE,
    providerId: 'google-sub-1',
    email: 'ana@example.com',
    emailVerified: true,
    name: 'Ana',
  };

  let refreshTokenRepository: { findByTokenHash: jest.Mock };
  let refreshTokenService: { hash: jest.Mock };
  let credentialRepository: {
    findByProvider: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
  };
  let googleOAuthProvider: { exchangeCodeForProfile: jest.Mock };
  let githubOAuthProvider: { exchangeCodeForProfile: jest.Mock };
  let useCase: SwitchOAuthProviderUseCase;

  beforeEach(() => {
    refreshTokenRepository = { findByTokenHash: jest.fn() };
    refreshTokenService = { hash: jest.fn().mockReturnValue('refresh-hash') };
    credentialRepository = {
      findByProvider: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };
    googleOAuthProvider = { exchangeCodeForProfile: jest.fn() };
    githubOAuthProvider = { exchangeCodeForProfile: jest.fn() };

    googleOAuthProvider.exchangeCodeForProfile.mockResolvedValue(
      googleProfile,
    );

    useCase = new SwitchOAuthProviderUseCase(
      refreshTokenRepository,
      refreshTokenService,
      credentialRepository,
      googleOAuthProvider,
      githubOAuthProvider,
    );
  });

  it('cambia el proveedor vinculado cuando el email coincide y la identidad está libre', async () => {
    const credential = buildCredential();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      buildRefreshToken(),
    );
    credentialRepository.findById.mockResolvedValue(credential);
    credentialRepository.findByProvider.mockResolvedValue(null);

    const result = await useCase.execute({
      refreshToken: 'raw-refresh-token',
      provider: 'GOOGLE',
      code: 'auth-code',
      codeVerifier: 'verifier',
    });

    expect(result).toEqual({
      status: 'PROVIDER_SWITCHED',
      provider: AuthProvider.GOOGLE,
    });
    expect(credential.provider).toBe(AuthProvider.GOOGLE);
    expect(credential.providerId).toBe('google-sub-1');
    expect(credentialRepository.update).toHaveBeenCalledWith(credential);
  });

  it('rechaza si no hay sesión válida', async () => {
    refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute({
        refreshToken: 'raw-refresh-token',
        provider: 'GOOGLE',
        code: 'auth-code',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow(InvalidRefreshTokenError);
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza si la cuenta de la sesión no está activa', async () => {
    const credential = buildCredential({ status: CredentialStatus.DISABLED });
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      buildRefreshToken(),
    );
    credentialRepository.findById.mockResolvedValue(credential);

    await expect(
      useCase.execute({
        refreshToken: 'raw-refresh-token',
        provider: 'GOOGLE',
        code: 'auth-code',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow(InactiveAccountError);
  });

  it('rechaza si el email del proveedor nuevo no coincide con el de la cuenta', async () => {
    const credential = buildCredential({ email: 'otra@example.com' });
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      buildRefreshToken(),
    );
    credentialRepository.findById.mockResolvedValue(credential);

    await expect(
      useCase.execute({
        refreshToken: 'raw-refresh-token',
        provider: 'GOOGLE',
        code: 'auth-code',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow(OAuthEmailMismatchError);
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza si la identidad del proveedor nuevo ya pertenece a otra cuenta', async () => {
    const credential = buildCredential();
    const otherCredential = buildCredential({ providerId: 'other' });
    Object.defineProperty(otherCredential, 'id', { value: 'other-account' });

    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      buildRefreshToken(),
    );
    credentialRepository.findById.mockResolvedValue(credential);
    credentialRepository.findByProvider.mockResolvedValue(otherCredential);

    await expect(
      useCase.execute({
        refreshToken: 'raw-refresh-token',
        provider: 'GOOGLE',
        code: 'auth-code',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow(OAuthIdentityAlreadyLinkedError);
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });

  it('permite re-confirmar el mismo proveedor ya vinculado a la propia cuenta', async () => {
    const credential = buildCredential();
    refreshTokenRepository.findByTokenHash.mockResolvedValue(
      buildRefreshToken(),
    );
    credentialRepository.findById.mockResolvedValue(credential);
    credentialRepository.findByProvider.mockResolvedValue(credential);

    const result = await useCase.execute({
      refreshToken: 'raw-refresh-token',
      provider: 'GOOGLE',
      code: 'auth-code',
      codeVerifier: 'verifier',
    });

    expect(result.status).toBe('PROVIDER_SWITCHED');
  });
});
