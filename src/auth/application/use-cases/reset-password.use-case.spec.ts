import { createHash } from 'crypto';
import { ResetPasswordUseCase } from './reset-password.use-case';
import { InvalidPasswordResetTokenError } from '../../domain/exceptions/auth.errors';
import {
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';
import { PasswordResetTokenEntity } from '../../domain/entities/password-reset-token.entity';

const RAW_TOKEN = 'a-raw-reset-token';
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN).digest('hex');

function buildCredential() {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      passwordHash: 'old-hash',
      roles: [AuthRole.USER],
      status: CredentialStatus.ACTIVE,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-1',
  );
}

function buildResetToken(
  overrides: Partial<{ expiresAt: Date; usedAt: Date | null }> = {},
) {
  return new PasswordResetTokenEntity(
    {
      credentialId: 'credential-1',
      tokenHash: TOKEN_HASH,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000),
      usedAt: overrides.usedAt ?? null,
      createdAt: new Date(),
    },
    'reset-token-1',
  );
}

function createPasswordResetTokenRepositoryMock() {
  return {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markAsUsed: jest.fn(),
  };
}

function createCredentialRepositoryMock() {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

function createPasswordHasherMock() {
  return {
    hash: jest.fn(),
    compare: jest.fn(),
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

describe('ResetPasswordUseCase', () => {
  let passwordResetTokenRepository: ReturnType<
    typeof createPasswordResetTokenRepositoryMock
  >;
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let passwordHasher: ReturnType<typeof createPasswordHasherMock>;
  let refreshTokenRepository: ReturnType<
    typeof createRefreshTokenRepositoryMock
  >;
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    passwordResetTokenRepository = createPasswordResetTokenRepositoryMock();
    credentialRepository = createCredentialRepositoryMock();
    passwordHasher = createPasswordHasherMock();
    refreshTokenRepository = createRefreshTokenRepositoryMock();

    useCase = new ResetPasswordUseCase(
      passwordResetTokenRepository,
      credentialRepository,
      passwordHasher,
      refreshTokenRepository,
    );
  });

  it('setea la nueva contraseña, marca el token usado y revoca todas las sesiones', async () => {
    const resetToken = buildResetToken();
    const credential = buildCredential();
    passwordResetTokenRepository.findByTokenHash.mockResolvedValue(resetToken);
    credentialRepository.findById.mockResolvedValue(credential);
    passwordHasher.hash.mockResolvedValue('new-hash');

    await useCase.execute({ token: RAW_TOKEN, newPassword: 'NewPass123!' });

    expect(credential.passwordHash).toBe('new-hash');
    expect(credentialRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: credential.id }),
    );
    expect(passwordResetTokenRepository.markAsUsed).toHaveBeenCalledWith(
      resetToken.id,
    );
    expect(refreshTokenRepository.revokeAllForCredential).toHaveBeenCalledWith(
      credential.id,
    );
  });

  it('rechaza un token que ya fue usado', async () => {
    const resetToken = buildResetToken({ usedAt: new Date() });
    passwordResetTokenRepository.findByTokenHash.mockResolvedValue(resetToken);

    await expect(
      useCase.execute({ token: RAW_TOKEN, newPassword: 'NewPass123!' }),
    ).rejects.toThrow(InvalidPasswordResetTokenError);
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza un token expirado', async () => {
    const resetToken = buildResetToken({
      expiresAt: new Date(Date.now() - 1000),
    });
    passwordResetTokenRepository.findByTokenHash.mockResolvedValue(resetToken);

    await expect(
      useCase.execute({ token: RAW_TOKEN, newPassword: 'NewPass123!' }),
    ).rejects.toThrow(InvalidPasswordResetTokenError);
    expect(credentialRepository.update).not.toHaveBeenCalled();
  });

  it('rechaza un token inexistente', async () => {
    passwordResetTokenRepository.findByTokenHash.mockResolvedValue(null);

    await expect(
      useCase.execute({ token: 'unknown', newPassword: 'NewPass123!' }),
    ).rejects.toThrow(InvalidPasswordResetTokenError);
  });
});
