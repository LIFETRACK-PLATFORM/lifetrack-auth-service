import { LoginUseCase } from './login.use-case';
import {
  InvalidCredentialsError,
  InactiveAccountError,
  AccountLockedError,
  EmailNotVerifiedError,
  NoPasswordSetError,
} from '../../domain/exceptions/auth.errors';
import {
  AuthRole,
  AuthProvider,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60_000;

function buildCredential(
  overrides: Partial<{
    status: CredentialStatus;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
  }> = {},
) {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      passwordHash: 'hashed-password',
      provider: AuthProvider.LOCAL,
      providerId: null,
      roles: [AuthRole.USER],
      status: overrides.status ?? CredentialStatus.ACTIVE,
      failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
      lockedUntil: overrides.lockedUntil ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-1',
  );
}

function createCredentialRepositoryMock() {
  return {
    findByEmail: jest.fn(),
    findByProvider: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteStalePendingVerification: jest.fn(),
  };
}

function createPasswordHasherMock() {
  return {
    hash: jest.fn(),
    compare: jest.fn(),
  };
}

function createTokenServiceMock() {
  return {
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

function createRefreshTokenServiceMock() {
  return {
    generate: jest.fn(),
    hash: jest.fn(),
  };
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

describe('LoginUseCase', () => {
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let passwordHasher: ReturnType<typeof createPasswordHasherMock>;
  let tokenService: ReturnType<typeof createTokenServiceMock>;
  let refreshTokenService: ReturnType<typeof createRefreshTokenServiceMock>;
  let refreshTokenRepository: ReturnType<
    typeof createRefreshTokenRepositoryMock
  >;
  let useCase: LoginUseCase;

  beforeEach(() => {
    credentialRepository = createCredentialRepositoryMock();
    passwordHasher = createPasswordHasherMock();
    tokenService = createTokenServiceMock();
    refreshTokenService = createRefreshTokenServiceMock();
    refreshTokenRepository = createRefreshTokenRepositoryMock();

    useCase = new LoginUseCase(
      credentialRepository,
      passwordHasher,
      tokenService,
      refreshTokenService,
      refreshTokenRepository,
      MAX_ATTEMPTS,
      LOCKOUT_DURATION_MS,
    );
  });

  it('emite access token y refresh token con credenciales válidas', async () => {
    const credential = buildCredential();
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.sign.mockResolvedValue('access-token');
    refreshTokenService.generate.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-token-hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 1000),
    });

    const result = await useCase.execute({
      email: credential.email,
      password: 'correct-password',
    });

    expect(result.session.accessToken).toBe('access-token');
    expect(result.session.refreshToken).toBe('refresh-token');
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialId: credential.id,
        tokenHash: 'refresh-token-hash',
        familyId: 'family-1',
      }),
    );
  });

  it('rechaza con mensaje genérico cuando el email no existe (sin fuga de información)', async () => {
    credentialRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'nadie@lifetrack.dev', password: 'x' }),
    ).rejects.toThrow(InvalidCredentialsError);

    // Se compara igual contra un hash dummy para mantener el tiempo constante.
    expect(passwordHasher.compare).toHaveBeenCalledWith(
      'x',
      expect.any(String),
    );
  });

  it('rechaza con el mismo mensaje genérico cuando el password es incorrecto', async () => {
    const credential = buildCredential();
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: credential.email, password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rechaza cuenta inactiva solo después de validar el password correcto', async () => {
    const credential = buildCredential({ status: CredentialStatus.DISABLED });
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: credential.email, password: 'correct' }),
    ).rejects.toThrow(InactiveAccountError);
  });

  it('rechaza con EmailNotVerifiedError una cuenta pendiente de verificación', async () => {
    const credential = buildCredential({
      status: CredentialStatus.PENDING_VERIFICATION,
    });
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);

    await expect(
      useCase.execute({ email: credential.email, password: 'correct' }),
    ).rejects.toThrow(EmailNotVerifiedError);
  });

  it('permite login normal en una cuenta activa tras haberse verificado', async () => {
    const credential = buildCredential({ status: CredentialStatus.ACTIVE });
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.sign.mockResolvedValue('access-token');
    refreshTokenService.generate.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-token-hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 1000),
    });

    const result = await useCase.execute({
      email: credential.email,
      password: 'correct-password',
    });

    expect(result.session.accessToken).toBe('access-token');
  });

  it('rechaza login local en cuenta solo-OAuth con mensaje genérico', async () => {
    const credential = new CredentialEntity(
      {
        userId: 'user-oauth',
        email: 'oauth@lifetrack.dev',
        passwordHash: null,
        provider: AuthProvider.GOOGLE,
        providerId: 'google-1',
        roles: [AuthRole.USER],
        status: CredentialStatus.ACTIVE,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'credential-oauth',
    );
    credentialRepository.findByEmail.mockResolvedValue(credential);

    await expect(
      useCase.execute({ email: credential.email, password: 'anything' }),
    ).rejects.toThrow(NoPasswordSetError);

    expect(passwordHasher.compare).not.toHaveBeenCalled();
  });

  it('bloquea la cuenta al alcanzar el umbral de intentos fallidos', async () => {
    const credential = buildCredential({
      failedLoginAttempts: MAX_ATTEMPTS - 1,
    });
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: credential.email, password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);

    expect(credentialRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: credential.id }),
    );
    expect(credential.isLocked()).toBe(true);
  });

  it('rechaza el login mientras la cuenta está bloqueada, sin comparar el password', async () => {
    const credential = buildCredential({
      lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
    });
    credentialRepository.findByEmail.mockResolvedValue(credential);

    await expect(
      useCase.execute({ email: credential.email, password: 'anything' }),
    ).rejects.toThrow(AccountLockedError);

    expect(passwordHasher.compare).not.toHaveBeenCalled();
  });

  it('permite login normal una vez expirada la ventana de bloqueo', async () => {
    const credential = buildCredential({
      lockedUntil: new Date(Date.now() - 1000),
    });
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.sign.mockResolvedValue('access-token');
    refreshTokenService.generate.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-token-hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 1000),
    });

    const result = await useCase.execute({
      email: credential.email,
      password: 'correct-password',
    });

    expect(result.session.accessToken).toBe('access-token');
  });

  it('reinicia el contador de intentos fallidos tras un login exitoso', async () => {
    const credential = buildCredential({ failedLoginAttempts: 3 });
    credentialRepository.findByEmail.mockResolvedValue(credential);
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.sign.mockResolvedValue('access-token');
    refreshTokenService.generate.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-token-hash',
      familyId: 'family-1',
      expiresAt: new Date(Date.now() + 1000),
    });

    await useCase.execute({
      email: credential.email,
      password: 'correct-password',
    });

    expect(credential.failedLoginAttempts).toBe(0);
    expect(credentialRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: credential.id }),
    );
  });
});
