import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';

export class CleanupExpiredRegistrationsUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly staleAfterMs: number,
  ) {}

  async execute(): Promise<number> {
    const cutoff = new Date(Date.now() - this.staleAfterMs);
    return this.credentialRepository.deleteStalePendingVerification(cutoff);
  }
}
