import { EmailVerificationToken as PrismaEmailVerificationToken } from 'generated/prisma/client';
import { EmailVerificationTokenEntity } from '../../../domain/entities/email-verification-token.entity';

export class EmailVerificationTokenMapper {
  static toDomain(
    raw: PrismaEmailVerificationToken,
  ): EmailVerificationTokenEntity {
    return new EmailVerificationTokenEntity(
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
