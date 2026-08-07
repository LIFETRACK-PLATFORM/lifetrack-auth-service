import { createHash } from 'crypto';
import { ConfirmEmailUseCase } from './confirm-email.use-case';
import { InvalidEmailVerificationTokenError } from '../../domain/exceptions/auth.errors';
import {
  AuthRole,
  AuthProvider,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';
import { EmailVerificationTokenEntity } from '../../domain/entities/email-verification-token.entity';

const RAW_TOKEN = 'a-raw-verification-token';
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');

function buildCredential(
  overrides: Partial<{ status: CredentialStatus }> = {},
) {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      passwordHash: 'hashed-password',
      provider: AuthProvider.LOCAL,
      providerId: null,
      roles: [AuthRole.USER],
      status: overrides.status ?? CredentialStatus.PENDING_VERIFICATION,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-1',
  );
}

function buildVerificationToken(
  overrides: Partial<{ expiresAt: Date; usedAt: Date | null }> = {},
) {
  return new EmailVerificationTokenEntity(
    {
      credentialId: 'credential-1',
      tokenHash: TOKEN_HASH,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000),
      usedAt: overrides.usedAt ?? null,
      createdAt: new Date(),
    },
    'verification-token-1',
  );
}

function createEmailVerificationTokenRepositoryMock() {
  return {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markAsUsed: jest.fn(),
    invalidateAllForCredential: jest.fn(),
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

describe('ConfirmEmailUseCase', () => {
  let emailVerificationTokenRepository: ReturnType<
    typeof createEmailVerificationTokenRepositoryMock
  >;
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let useCase: ConfirmEmailUseCase;

  beforeEach(() => {
    emailVerificationTokenRepository =
      createEmailVerificationTokenRepositoryMock();
    credentialRepository = createCredentialRepositoryMock();

    useCase = new ConfirmEmailUseCase(
      emailVerificationTokenRepository,
      credentialRepository,
    );
  });

  it('activa la cuenta y marca el token usado con un token válido y vigente', async () => {
    const verificationToken = buildVerificationToken();
    const credential = buildCredential();
    emailVerificationTokenRepository.findByTokenHash.mockResolvedValue(
      verificationToken,
    );
    credentialRepository.findById.mockResolvedValue(credential);

    await useCase.execute({ token: RAW_TOKEN });

    expect(credential.status).toBe(CredentialStatus.ACTIVE);
    expect(credential.emailVerifiedAt).toBeInstanceOf(Date);
    expect(credentialRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: credential.id }),
    );
    expect(emailVerificationTokenRepository.markAsUsed).toHaveBeenCalledWith(
      verificationToken.id,
    );
  });

  it('rechaza un token que ya fue usado sin mutar la cuenta', async () => {
    const verificationToken = buildVerificationToken({ usedAt: new Date() });
    emailVerificationTokenRepository.findByTokenHash.mockResolvedValue(
      verificationToken,
    );

    await expect(useCase.execute({ token: RAW_TOKEN })).rejects.toThrow(
      InvalidEmailVerificationTokenError,
    );
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza un token expirado sin mutar la cuenta', async () => {
    const verificationToken = buildVerificationToken({
      expiresAt: new Date(Date.now() - 1000),
    });
    emailVerificationTokenRepository.findByTokenHash.mockResolvedValue(
      verificationToken,
    );

    await expect(useCase.execute({ token: RAW_TOKEN })).rejects.toThrow(
      InvalidEmailVerificationTokenError,
    );
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza un token inexistente', async () => {
    emailVerificationTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'unknown' })).rejects.toThrow(
      InvalidEmailVerificationTokenError,
    );
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });
});
