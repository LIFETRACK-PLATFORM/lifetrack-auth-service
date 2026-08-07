import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OAuthLinkTokenEntity } from '../../../domain/entities/oauth-link-token.entity';
import type {
  CreateOAuthLinkTokenInput,
  OAuthLinkTokenRepositoryPort,
} from '../../../domain/ports/oauth-link-token.repository.port';
import { OAuthLinkTokenMapper } from './oauth-link-token.mapper';

@Injectable()
export class PrismaOAuthLinkTokenRepository implements OAuthLinkTokenRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateOAuthLinkTokenInput,
  ): Promise<OAuthLinkTokenEntity> {
    const raw = await this.prisma.oAuthLinkToken.create({
      data: {
        credentialId: data.credentialId,
        provider: data.provider,
        providerId: data.providerId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
    return OAuthLinkTokenMapper.toDomain(raw);
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<OAuthLinkTokenEntity | null> {
    const raw = await this.prisma.oAuthLinkToken.findUnique({
      where: { tokenHash },
    });
    return raw ? OAuthLinkTokenMapper.toDomain(raw) : null;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.prisma.oAuthLinkToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
