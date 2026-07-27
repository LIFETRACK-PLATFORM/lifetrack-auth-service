import { RefreshToken as PrismaRefreshToken } from 'generated/prisma/client';
import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity';

export class RefreshTokenMapper {
  static toDomain(raw: PrismaRefreshToken): RefreshTokenEntity {
    return new RefreshTokenEntity(
      {
        credentialId: raw.credentialId,
        tokenHash: raw.tokenHash,
        familyId: raw.familyId,
        replacedById: raw.replacedById,
        expiresAt: raw.expiresAt,
        revokedAt: raw.revokedAt,
        createdAt: raw.createdAt,
      },
      raw.id,
    );
  }
}
