import { ResendVerificationUseCase } from './resend-verification.use-case';
import {
  AuthRole,
  AuthProvider,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';

const TOKEN_TTL_MS = 24 * 60 * 60_000;
const VERIFICATION_URL_BASE = 'http://localhost:3000/confirm-email';

function buildCredential(status: CredentialStatus) {
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

function createEmailVerificationTokenRepositoryMock() {
  return {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    markAsUsed: jest.fn(),
    invalidateAllForCredential: jest.fn(),
  };
}

function createEmailSenderMock() {
  return {
    sendPasswordReset: jest.fn(),
    sendEmailVerification: jest.fn(),
  };
}

describe('ResendVerificationUseCase', () => {
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let emailVerificationTokenRepository: ReturnType<
    typeof createEmailVerificationTokenRepositoryMock
  >;
  let emailSender: ReturnType<typeof createEmailSenderMock>;
  let useCase: ResendVerificationUseCase;

  beforeEach(() => {
    credentialRepository = createCredentialRepositoryMock();
    emailVerificationTokenRepository =
      createEmailVerificationTokenRepositoryMock();
    emailSender = createEmailSenderMock();

    useCase = new ResendVerificationUseCase(
      credentialRepository,
      emailVerificationTokenRepository,
      emailSender,
      TOKEN_TTL_MS,
      VERIFICATION_URL_BASE,
    );
  });

  it('invalida el token anterior, genera uno nuevo y reenvía el email cuando la cuenta está pendiente de verificación', async () => {
    const credential = buildCredential(CredentialStatus.PENDING_VERIFICATION);
    credentialRepository.findByEmail.mockResolvedValue(credential);

    await useCase.execute({ email: credential.email });

    expect(
      emailVerificationTokenRepository.invalidateAllForCredential,
    ).toHaveBeenCalledWith(credential.id);
    expect(credentialRepository.update).toHaveBeenCalledWith(credential);
    expect(emailVerificationTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ credentialId: credential.id }),
    );
    expect(emailSender.sendEmailVerification).toHaveBeenCalledWith(
      credential.email,
      expect.stringContaining(VERIFICATION_URL_BASE),
    );
  });

  it('no hace nada cuando la cuenta ya está activa (sin fuga de información)', async () => {
    credentialRepository.findByEmail.mockResolvedValue(
      buildCredential(CredentialStatus.ACTIVE),
    );

    await useCase.execute({ email: 'alice@lifetrack.dev' });

    expect(
      emailVerificationTokenRepository.invalidateAllForCredential,
    ).not.toHaveBeenCalled();
    expect(emailSender.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('no hace nada cuando la cuenta no existe (sin fuga de información)', async () => {
    credentialRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute({ email: 'nadie@lifetrack.dev' });

    expect(
      emailVerificationTokenRepository.invalidateAllForCredential,
    ).not.toHaveBeenCalled();
    expect(emailSender.sendEmailVerification).not.toHaveBeenCalled();
  });
});
