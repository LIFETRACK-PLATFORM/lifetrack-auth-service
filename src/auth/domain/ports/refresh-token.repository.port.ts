import { RefreshTokenEntity } from '../entities/refresh-token.entity';

export type CreateRefreshTokenInput = {
  credentialId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
};

export interface RefreshTokenRepositoryPort {
  create(data: CreateRefreshTokenInput): Promise<RefreshTokenEntity>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null>;
  revoke(id: string, replacedById?: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForCredential(credentialId: string): Promise<void>;
}
