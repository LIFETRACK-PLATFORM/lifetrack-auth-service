import { Credential as PrismaCredential } from 'generated/prisma/client';
import {
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
        roles: raw.roles as AuthRole[],
        status: raw.status as CredentialStatus,
        emailVerifiedAt: raw.emailVerifiedAt,
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
      roles: domain.roles,
      status: domain.status,
    };
  }
}
