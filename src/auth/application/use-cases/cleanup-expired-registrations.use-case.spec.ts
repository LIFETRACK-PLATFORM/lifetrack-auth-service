import { CleanupExpiredRegistrationsUseCase } from './cleanup-expired-registrations.use-case';

const STALE_AFTER_MS = 30 * 86_400_000; // 30 días

function createCredentialRepositoryMock() {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteStalePendingVerification: jest.fn<Promise<number>, [Date]>(),
  };
}

describe('CleanupExpiredRegistrationsUseCase', () => {
  let credentialRepository: ReturnType<typeof createCredentialRepositoryMock>;
  let useCase: CleanupExpiredRegistrationsUseCase;

  beforeEach(() => {
    credentialRepository = createCredentialRepositoryMock();
    useCase = new CleanupExpiredRegistrationsUseCase(
      credentialRepository,
      STALE_AFTER_MS,
    );
  });

  it('borra las credenciales pendientes de verificación con más de 30 días sin actividad', async () => {
    credentialRepository.deleteStalePendingVerification.mockResolvedValue(3);

    const deletedCount = await useCase.execute();

    expect(deletedCount).toBe(3);
    const [cutoff] =
      credentialRepository.deleteStalePendingVerification.mock.calls[0];
    expect(cutoff).toBeInstanceOf(Date);
    expect(cutoff.getTime()).toBeLessThanOrEqual(
      Date.now() - STALE_AFTER_MS + 1000,
    );
  });

  it('no borra nada cuando no hay credenciales viejas sin actividad', async () => {
    credentialRepository.deleteStalePendingVerification.mockResolvedValue(0);

    const deletedCount = await useCase.execute();

    expect(deletedCount).toBe(0);
  });
});
