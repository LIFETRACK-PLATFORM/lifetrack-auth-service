import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailVerificationTokenEntity } from '../../../domain/entities/email-verification-token.entity';
import type {
  CreateEmailVerificationTokenInput,
  EmailVerificationTokenRepositoryPort,
} from '../../../domain/ports/email-verification-token.repository.port';
import { EmailVerificationTokenMapper } from './email-verification-token.mapper';

@Injectable()
export class PrismaEmailVerificationTokenRepository
  implements EmailVerificationTokenRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateEmailVerificationTokenInput,
  ): Promise<EmailVerificationTokenEntity> {
    const raw = await this.prisma.emailVerificationToken.create({
      data: {
        credentialId: data.credentialId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return EmailVerificationTokenMapper.toDomain(raw);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationTokenEntity | null> {
    const raw = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    return raw ? EmailVerificationTokenMapper.toDomain(raw) : null;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateAllForCredential(credentialId: string): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { credentialId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
