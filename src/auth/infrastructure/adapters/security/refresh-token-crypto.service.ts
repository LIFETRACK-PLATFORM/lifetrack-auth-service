import { randomBytes, randomUUID, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import type {
  GeneratedRefreshToken,
  RefreshTokenServicePort,
} from '../../../domain/ports/refresh-token.service.port';
import { envs } from '../../../../config/envs';
import { parseDurationToMs } from '../../../../shared/utils/parse-duration';

@Injectable()
export class RefreshTokenCryptoService implements RefreshTokenServicePort {
  private readonly ttlMs = parseDurationToMs(envs.jwtRefreshExpiresIn);

  generate(familyId?: string): GeneratedRefreshToken {
    const token = randomBytes(32).toString('base64url');

    return {
      token,
      tokenHash: this.hash(token),
      familyId: familyId ?? randomUUID(),
      expiresAt: new Date(Date.now() + this.ttlMs),
    };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
