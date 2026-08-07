import { OAuthLinkToken as PrismaOAuthLinkToken } from 'generated/prisma/client';
import { AuthProvider } from '../../../domain/entities/credential.entity';
import { OAuthLinkTokenEntity } from '../../../domain/entities/oauth-link-token.entity';

export class OAuthLinkTokenMapper {
  static toDomain(raw: PrismaOAuthLinkToken): OAuthLinkTokenEntity {
    return new OAuthLinkTokenEntity(
      {
        credentialId: raw.credentialId,
        provider: raw.provider as AuthProvider,
        providerId: raw.providerId,
        tokenHash: raw.tokenHash,
        expiresAt: raw.expiresAt,
        usedAt: raw.usedAt,
        createdAt: raw.createdAt,
      },
      raw.id,
    );
  }
}
