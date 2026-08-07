import { LoginWithOAuthUseCase } from './login-with-oauth.use-case';
import {
  AuthProvider,
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';
import type { OAuthProfile } from '../../domain/ports/oauth-provider.port';

const LINK_TTL_MS = 15 * 60_000;

function buildOAuthCredential(
  overrides: Partial<{
    provider: AuthProvider;
    providerId: string;
    email: string;
  }> = {},
) {
  return new CredentialEntity(
    {
      userId: 'user-oauth',
      email: overrides.email ?? 'oauth@lifetrack.dev',
      passwordHash: null,
      provider: overrides.provider ?? AuthProvider.GOOGLE,
      providerId: overrides.providerId ?? 'google-sub-1',
      roles: [AuthRole.USER],
      status: CredentialStatus.ACTIVE,
      failedLoginAttempts: 0,
      emailVerifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-oauth',
  );
}

function buildLocalCredential(email = 'local@lifetrack.dev') {
  return new CredentialEntity(
    {
      userId: 'user-local',
      email,
      passwordHash: 'hashed-password',
      provider: AuthProvider.LOCAL,
      providerId: null,
      roles: [AuthRole.USER],
      status: CredentialStatus.ACTIVE,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-local',
  );
}

describe('LoginWithOAuthUseCase', () => {
  const googleProfile: OAuthProfile = {
    provider: AuthProvider.GOOGLE,
    providerId: 'google-sub-1',
    email: 'oauth@lifetrack.dev',
    emailVerified: true,
    name: 'OAuth User',
  };

  let credentialRepository: {
    findByEmail: jest.Mock;
    findByProvider: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteStalePendingVerification: jest.Mock;
  };
  let oauthLinkTokenRepository: {
    create: jest.Mock;
    findByTokenHash: jest.Mock;
    markAsUsed: jest.Mock;
  };
  let googleOAuthProvider: { exchangeCodeForProfile: jest.Mock };
  let githubOAuthProvider: { exchangeCodeForProfile: jest.Mock };
  let tokenService: { sign: jest.Mock; verify: jest.Mock };
  let refreshTokenService: { generate: jest.Mock; hash: jest.Mock };
  let refreshTokenRepository: { create: jest.Mock };
  let eventPublisher: { publish: jest.Mock };
  let useCase: LoginWithOAuthUseCase;

  beforeEach(() => {
    credentialRepository = {
      findByEmail: jest.fn(),
      findByProvider: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteStalePendingVerification: jest.fn(),
    };
    oauthLinkTokenRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      markAsUsed: jest.fn(),
    };
    googleOAuthProvider = { exchangeCodeForProfile: jest.fn() };
    githubOAuthProvider = { exchangeCodeForProfile: jest.fn() };
    tokenService = { sign: jest.fn(), verify: jest.fn() };
    refreshTokenService = {
      generate: jest.fn().mockReturnValue({
        token: 'refresh-token',
        tokenHash: 'refresh-hash',
        familyId: 'family-1',
        expiresAt: new Date(Date.now() + 1000),
      }),
      hash: jest.fn(),
    };
    refreshTokenRepository = { create: jest.fn() };
    eventPublisher = { publish: jest.fn() };

    googleOAuthProvider.exchangeCodeForProfile.mockResolvedValue(googleProfile);

    useCase = new LoginWithOAuthUseCase(
      credentialRepository,
      oauthLinkTokenRepository,
      googleOAuthProvider,
      githubOAuthProvider,
      tokenService,
      refreshTokenService,
      refreshTokenRepository,
      eventPublisher,
      LINK_TTL_MS,
    );
  });

  it('emite sesión cuando la credencial OAuth ya existe', async () => {
    const existing = buildOAuthCredential();
    credentialRepository.findByProvider.mockResolvedValue(existing);
    tokenService.sign.mockResolvedValue('access-token');

    const result = await useCase.execute({
      provider: 'GOOGLE',
      code: 'auth-code',
      codeVerifier: 'verifier',
    });

    expect(result.status).toBe('AUTHENTICATED');
    if (result.status === 'AUTHENTICATED') {
      expect(result.session.accessToken).toBe('access-token');
    }
    expect(credentialRepository.create).not.toHaveBeenCalled();
  });

  it('crea cuenta nueva en primer login OAuth', async () => {
    credentialRepository.findByProvider.mockResolvedValue(null);
    credentialRepository.findByEmail.mockResolvedValue(null);
    const created = buildOAuthCredential();
    credentialRepository.create.mockResolvedValue(created);
    tokenService.sign.mockResolvedValue('access-token');

    const result = await useCase.execute({
      provider: 'GOOGLE',
      code: 'auth-code',
      codeVerifier: 'verifier',
    });

    expect(result.status).toBe('AUTHENTICATED');
    expect(credentialRepository.create).toHaveBeenCalled();
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'auth.user_registered' }),
    );
  });

  it('requiere vinculación cuando el email coincide con cuenta LOCAL', async () => {
    credentialRepository.findByProvider.mockResolvedValue(null);
    credentialRepository.findByEmail.mockResolvedValue(
      buildLocalCredential(googleProfile.email),
    );
    oauthLinkTokenRepository.create.mockResolvedValue({});

    const result = await useCase.execute({
      provider: 'GOOGLE',
      code: 'auth-code',
      codeVerifier: 'verifier',
    });

    expect(result.status).toBe('ACCOUNT_LINK_REQUIRED');
    if (result.status === 'ACCOUNT_LINK_REQUIRED') {
      expect(result.linkToken).toEqual(expect.any(String));
      expect(result.provider).toBe(AuthProvider.GOOGLE);
    }
    expect(oauthLinkTokenRepository.create).toHaveBeenCalled();
  });

  it('rechaza con error claro cuando el email ya existe con otro proveedor OAuth', async () => {
    credentialRepository.findByProvider.mockResolvedValue(null);
    credentialRepository.findByEmail.mockResolvedValue(
      buildOAuthCredential({
        provider: AuthProvider.GITHUB,
        providerId: 'github-sub-1',
        email: googleProfile.email,
      }),
    );

    await expect(
      useCase.execute({
        provider: 'GOOGLE',
        code: 'auth-code',
        codeVerifier: 'verifier',
      }),
    ).rejects.toThrow(/GitHub/);
    expect(credentialRepository.create).not.toHaveBeenCalled();
  });
});
