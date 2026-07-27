import { RegisterUseCase } from './register.use-case';
import {
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../domain/entities/credential.entity';
import { EmailAlreadyExistsError } from '../../domain/exceptions/auth.errors';

const TOKEN_TTL_MS = 24 * 60 * 60_000;
const VERIFICATION_URL_BASE = 'http://localhost:3000/confirm-email';

function buildCredential() {
  return new CredentialEntity(
    {
      userId: 'user-1',
      email: 'alice@lifetrack.dev',
      passwordHash: 'hashed-password',
      roles: [AuthRole.USER],
      status: CredentialStatus.PENDING_VERIFICATION,
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

function createPasswordHasherMock() {
  return {
    hash: jest.fn(),
    compare: jest.fn(),
  };
}

function createEventPublisherMock() {
  return {
    publish: jest.fn(),
  };
}

function createEmailVerificationTokenRepositoryMock() {
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

describe('RegisterUseCase', () => {
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let passwordHasher: ReturnType<typeof createPasswordHasherMock>;
  let eventPublisher: ReturnType<typeof createEventPublisherMock>;
  let emailVerificationTokenRepository: ReturnType<
    typeof createEmailVerificationTokenRepositoryMock
  >;
  let emailSender: ReturnType<typeof createEmailSenderMock>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    credentialRepository = createCredentialRepositoryMock();
    passwordHasher = createPasswordHasherMock();
    eventPublisher = createEventPublisherMock();
    emailVerificationTokenRepository =
      createEmailVerificationTokenRepositoryMock();
    emailSender = createEmailSenderMock();

    useCase = new RegisterUseCase(
      credentialRepository,
      passwordHasher,
      eventPublisher,
      emailVerificationTokenRepository,
      emailSender,
      TOKEN_TTL_MS,
      VERIFICATION_URL_BASE,
    );
  });

  it('crea la cuenta como PENDING_VERIFICATION y envía el email de verificación', async () => {
    const credential = buildCredential();
    credentialRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed-password');
    credentialRepository.create.mockResolvedValue(credential);

    const result = await useCase.execute({
      email: credential.email,
      password: 'Password123!',
      displayName: 'Alice',
    });

    expect(credentialRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: CredentialStatus.PENDING_VERIFICATION }),
    );
    expect(result.status).toBe(CredentialStatus.PENDING_VERIFICATION);
    expect(emailVerificationTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ credentialId: credential.id }),
    );
    expect(emailSender.sendEmailVerification).toHaveBeenCalledWith(
      credential.email,
      expect.stringContaining(VERIFICATION_URL_BASE),
    );
  });

  it('rechaza el registro si el email ya existe', async () => {
    credentialRepository.findByEmail.mockResolvedValue(buildCredential());

    await expect(
      useCase.execute({
        email: 'alice@lifetrack.dev',
        password: 'Password123!',
        displayName: 'Alice',
      }),
    ).rejects.toThrow(EmailAlreadyExistsError);

    expect(credentialRepository.create).not.toHaveBeenCalled();
    expect(emailSender.sendEmailVerification).not.toHaveBeenCalled();
  });

  it('no revierte el registro si el envío del email de verificación falla', async () => {
    const credential = buildCredential();
    credentialRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed-password');
    credentialRepository.create.mockResolvedValue(credential);
    emailSender.sendEmailVerification.mockRejectedValue(
      new Error('Resend no disponible'),
    );

    const result = await useCase.execute({
      email: credential.email,
      password: 'Password123!',
      displayName: 'Alice',
    });

    expect(result.status).toBe(CredentialStatus.PENDING_VERIFICATION);
    expect(credentialRepository.create).toHaveBeenCalled();
  });
});
