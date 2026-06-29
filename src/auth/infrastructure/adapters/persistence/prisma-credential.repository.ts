import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialEntity } from '../../../domain/entities/credential.entity';
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

  async create(data: CreateCredentialInput): Promise<CredentialEntity> {
    const raw = await this.prisma.credential.create({
      data: {
        userId: data.userId,
        email: data.email,
        passwordHash: data.passwordHash,
        roles: data.roles,
      },
    });
    return CredentialMapper.toDomain(raw);
  }
}
