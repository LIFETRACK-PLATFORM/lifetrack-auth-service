import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshTokenEntity } from '../../../domain/entities/refresh-token.entity';
import type {
  CreateRefreshTokenInput,
  RefreshTokenRepositoryPort,
} from '../../../domain/ports/refresh-token.repository.port';
import { RefreshTokenMapper } from './refresh-token.mapper';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRefreshTokenInput): Promise<RefreshTokenEntity> {
    const raw = await this.prisma.refreshToken.create({
      data: {
        credentialId: data.credentialId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        expiresAt: data.expiresAt,
      },
    });
    return RefreshTokenMapper.toDomain(raw);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenEntity | null> {
    const raw = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    return raw ? RefreshTokenMapper.toDomain(raw) : null;
  }

  async revoke(id: string, replacedById?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), replacedById },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForCredential(credentialId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { credentialId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
