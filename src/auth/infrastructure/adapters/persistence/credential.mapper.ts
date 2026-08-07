import { Credential as PrismaCredential } from 'generated/prisma/client';
import {
  AuthProvider,
  AuthRole,
  CredentialEntity,
  CredentialStatus,
} from '../../../domain/entities/credential.entity';

export class CredentialMapper {
  static toDomain(raw: PrismaCredential): CredentialEntity {
    return new CredentialEntity(
      {
        userId: raw.userId,
        email: raw.email,
        passwordHash: raw.passwordHash,
        provider: raw.provider as AuthProvider,
        providerId: raw.providerId,
        roles: raw.roles as AuthRole[],
        status: raw.status as CredentialStatus,
        emailVerifiedAt: raw.emailVerifiedAt,
        failedLoginAttempts: raw.failedLoginAttempts,
        lockedUntil: raw.lockedUntil,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    );
  }

  static toPersistence(domain: CredentialEntity) {
    return {
      userId: domain.userId,
      email: domain.email,
      passwordHash: domain.passwordHash,
      provider: domain.provider,
      providerId: domain.providerId,
      roles: domain.roles,
      status: domain.status,
      emailVerifiedAt: domain.emailVerifiedAt,
      failedLoginAttempts: domain.failedLoginAttempts,
      lockedUntil: domain.lockedUntil,
    };
  }
}
