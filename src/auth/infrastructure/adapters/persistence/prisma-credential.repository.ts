import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuthProvider,
  CredentialEntity,
  CredentialStatus,
} from '../../../domain/entities/credential.entity';
import type {
  CreateCredentialInput,
  CredentialRepositoryPort,
} from '../../../domain/ports/credential.repository.port';
import { CredentialMapper } from './credential.mapper';

@Injectable()
export class PrismaCredentialRepository implements CredentialRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<CredentialEntity | null> {
    const raw = await this.prisma.credential.findUnique({ where: { email } });
    return raw ? CredentialMapper.toDomain(raw) : null;
  }

  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<CredentialEntity | null> {
    const raw = await this.prisma.credential.findFirst({
      where: { provider, providerId },
    });
    return raw ? CredentialMapper.toDomain(raw) : null;
  }

  async findById(id: string): Promise<CredentialEntity | null> {
    const raw = await this.prisma.credential.findUnique({ where: { id } });
    return raw ? CredentialMapper.toDomain(raw) : null;
  }

  async create(data: CreateCredentialInput): Promise<CredentialEntity> {
    const raw = await this.prisma.credential.create({
      data: {
        userId: data.userId,
        email: data.email,
        passwordHash: data.passwordHash,
        provider: data.provider ?? AuthProvider.LOCAL,
        providerId: data.providerId ?? null,
        roles: data.roles,
        status: data.status,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
      },
    });
    return CredentialMapper.toDomain(raw);
  }

  async update(credential: CredentialEntity): Promise<void> {
    await this.prisma.credential.update({
      where: { id: credential.id },
      data: CredentialMapper.toPersistence(credential),
    });
  }

  async deleteStalePendingVerification(olderThan: Date): Promise<number> {
    const stale = await this.prisma.credential.findMany({
      where: {
        status: CredentialStatus.PENDING_VERIFICATION,
        updatedAt: { lt: olderThan },
      },
      select: { id: true },
    });
    if (!stale.length) return 0;

    const staleIds = stale.map((credential) => credential.id);
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({
        where: { credentialId: { in: staleIds } },
      }),
      this.prisma.oAuthLinkToken.deleteMany({
        where: { credentialId: { in: staleIds } },
      }),
      this.prisma.credential.deleteMany({
        where: { id: { in: staleIds } },
      }),
    ]);
    return staleIds.length;
  }
}
