import { ForgotPasswordUseCase } from './forgot-password.use-case';
import {
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';

const TOKEN_TTL_MS = 15 * 60_000;
const RESET_URL_BASE = 'http://localhost:3000/reset-password';

function buildCredential() {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      passwordHash: 'hashed-password',
      roles: [AuthRole.USER],
      status: CredentialStatus.ACTIVE,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'credential-1',
  );
}

function createCredentialRepositoryMock() {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

function createPasswordResetTokenRepositoryMock() {
  return {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markAsUsed: jest.fn(),
  };
}

function createEmailSenderMock() {
  return {
    sendPasswordReset: jest.fn(),
    sendEmailVerification: jest.fn(),
  };
}

describe('ForgotPasswordUseCase', () => {
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let passwordResetTokenRepository: ReturnType<
    typeof createPasswordResetTokenRepositoryMock
  >;
  let emailSender: ReturnType<typeof createEmailSenderMock>;
  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    credentialRepository = createCredentialRepositoryMock();
    passwordResetTokenRepository = createPasswordResetTokenRepositoryMock();
    emailSender = createEmailSenderMock();

    useCase = new ForgotPasswordUseCase(
      credentialRepository,
      passwordResetTokenRepository,
      emailSender,
      TOKEN_TTL_MS,
      RESET_URL_BASE,
    );
  });

  it('genera un token y envía el email cuando la cuenta existe', async () => {
    const credential = buildCredential();
    credentialRepository.findByEmail.mockResolvedValue(credential);

    await useCase.execute({ email: credential.email });

    expect(passwordResetTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ credentialId: credential.id }),
    );
    expect(emailSender.sendPasswordReset).toHaveBeenCalledWith(
      credential.email,
      expect.stringContaining(RESET_URL_BASE),
    );
  });

  it('no genera token ni envía email cuando la cuenta no existe (sin fuga de información)', async () => {
    credentialRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute({ email: 'nadie@lifetrack.dev' });

    expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
    expect(emailSender.sendPasswordReset).not.toHaveBeenCalled();
  });
});
