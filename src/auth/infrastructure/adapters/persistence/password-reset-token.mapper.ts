import { PasswordResetToken as PrismaPasswordResetToken } from 'generated/prisma/client';
import { PasswordResetTokenEntity } from '../../../domain/entities/password-reset-token.entity';

export class PasswordResetTokenMapper {
  static toDomain(raw: PrismaPasswordResetToken): PasswordResetTokenEntity {
    return new PasswordResetTokenEntity(
      {
        credentialId: raw.credentialId,
        tokenHash: raw.tokenHash,
        expiresAt: raw.expiresAt,
        usedAt: raw.usedAt,
        createdAt: raw.createdAt,
      },
      raw.id,
    );
  }
}
