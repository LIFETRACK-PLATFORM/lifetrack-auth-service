import { AuthProvider } from '../entities/credential.entity';
import { OAuthLinkTokenEntity } from '../entities/oauth-link-token.entity';

export type CreateOAuthLinkTokenInput = {
  credentialId: string;
  provider: AuthProvider;
  providerId: string;
  tokenHash: string;
  expiresAt: Date;
};

export interface OAuthLinkTokenRepositoryPort {
  create(data: CreateOAuthLinkTokenInput): Promise<OAuthLinkTokenEntity>;
  findByTokenHash(tokenHash: string): Promise<OAuthLinkTokenEntity | null>;
  markAsUsed(id: string): Promise<void>;
}
