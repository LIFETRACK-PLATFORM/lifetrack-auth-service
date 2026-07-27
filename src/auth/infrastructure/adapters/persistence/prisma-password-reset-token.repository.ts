import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordResetTokenEntity } from '../../../domain/entities/password-reset-token.entity';
import type {
  CreatePasswordResetTokenInput,
  PasswordResetTokenRepositoryPort,
} from '../../../domain/ports/password-reset-token.repository.port';
import { PasswordResetTokenMapper } from './password-reset-token.mapper';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreatePasswordResetTokenInput,
  ): Promise<PasswordResetTokenEntity> {
    const raw = await this.prisma.passwordResetToken.create({
      data: {
        credentialId: data.credentialId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return PasswordResetTokenMapper.toDomain(raw);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenEntity | null> {
    const raw = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    return raw ? PasswordResetTokenMapper.toDomain(raw) : null;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
