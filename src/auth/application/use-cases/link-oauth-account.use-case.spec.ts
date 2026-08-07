import { LinkOAuthAccountUseCase } from './link-oauth-account.use-case';
import {
  AuthProvider,
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';
import {
  InvalidCredentialsError,
  InvalidLinkTokenError,
} from '../../domain/exceptions/auth.errors';
import { OAuthLinkTokenEntity } from '../../domain/entities/oauth-link-token.entity';

describe('LinkOAuthAccountUseCase', () => {
  let oauthLinkTokenRepository: {
    create: jest.Mock;
    findByTokenHash: jest.Mock;
    markAsUsed: jest.Mock;
  };
  let credentialRepository: {
    findByEmail: jest.Mock;
    findByProvider: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteStalePendingVerification: jest.Mock;
  };
  let passwordHasher: { hash: jest.Mock; compare: jest.Mock };
  let tokenService: { sign: jest.Mock; verify: jest.Mock };
  let refreshTokenService: {
    generate: jest.Mock;
    hash: jest.Mock;
  };
  let refreshTokenRepository: { create: jest.Mock };
  let useCase: LinkOAuthAccountUseCase;

  const linkTokenValue = 'raw-link-token';
  const credential = new CredentialEntity(
    {
      userId: 'user-local',
      email: 'ana@example.com',
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

  beforeEach(() => {
    oauthLinkTokenRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      markAsUsed: jest.fn(),
    };
    credentialRepository = {
      findByEmail: jest.fn(),
      findByProvider: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteStalePendingVerification: jest.fn(),
    };
    passwordHasher = { hash: jest.fn(), compare: jest.fn() };
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

    useCase = new LinkOAuthAccountUseCase(
      oauthLinkTokenRepository,
      credentialRepository,
      passwordHasher,
      tokenService,
      refreshTokenService,
      refreshTokenRepository,
    );
  });

  it('vincula la cuenta y emite sesión con password correcto', async () => {
    const linkToken = new OAuthLinkTokenEntity(
      {
        credentialId: credential.id,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-sub-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      },
      'link-token-1',
    );

    oauthLinkTokenRepository.findByTokenHash.mockResolvedValue(linkToken);
    credentialRepository.findById.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.sign.mockResolvedValue('access-token');

    const result = await useCase.execute({
      provider: 'GOOGLE',
      linkToken: linkTokenValue,
      password: 'correct-password',
    });

    expect(result.status).toBe('AUTHENTICATED');
    expect(credential.provider).toBe(AuthProvider.GOOGLE);
    expect(credential.providerId).toBe('google-sub-1');
    expect(credentialRepository.update).toHaveBeenCalledWith(credential);
    expect(oauthLinkTokenRepository.markAsUsed).toHaveBeenCalledWith(
      linkToken.id,
    );
  });

  it('rechaza token de vinculación inválido', async () => {
    oauthLinkTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute({
        provider: 'GOOGLE',
        linkToken: linkTokenValue,
        password: 'password',
      }),
    ).rejects.toThrow(InvalidLinkTokenError);
  });

  it('rechaza password incorrecto', async () => {
    const linkToken = new OAuthLinkTokenEntity(
      {
        credentialId: credential.id,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-sub-1',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      },
      'link-token-1',
    );

    oauthLinkTokenRepository.findByTokenHash.mockResolvedValue(linkToken);
    credentialRepository.findById.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        provider: 'GOOGLE',
        linkToken: linkTokenValue,
        password: 'wrong-password',
      }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});
