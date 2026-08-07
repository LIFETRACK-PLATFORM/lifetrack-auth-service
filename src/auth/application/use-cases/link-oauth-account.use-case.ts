import { createHash } from 'crypto';
import { parseAuthProvider } from '../../domain/entities/credential.entity';
import {
  InvalidCredentialsError,
  InactiveAccountError,
  InvalidLinkTokenError,
} from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { OAuthLinkTokenRepositoryPort } from '../../domain/ports/oauth-link-token.repository.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { TokenServicePort } from '../../domain/ports/token.service.port';
import type { RefreshTokenServicePort } from '../../domain/ports/refresh-token.service.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { LoginResult } from '../dtos/login-result';
import type { LinkOAuthAccountInput } from '../dtos/link-oauth-account.input';

export class LinkOAuthAccountUseCase {
  constructor(
    private readonly oauthLinkTokenRepository: OAuthLinkTokenRepositoryPort,
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenService: RefreshTokenServicePort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}

  async execute(input: LinkOAuthAccountInput): Promise<LoginResult> {
    const tokenHash = createHash('sha256')
      .update(input.linkToken)
      .digest('hex');
    const linkToken =
      await this.oauthLinkTokenRepository.findByTokenHash(tokenHash);

    if (!linkToken?.isValid()) {
      throw new InvalidLinkTokenError();
    }

    const provider = parseAuthProvider(input.provider);

    if (linkToken.provider !== provider) {
      throw new InvalidLinkTokenError();
    }

    const credential = await this.credentialRepository.findById(
      linkToken.credentialId,
    );

    if (!credential?.hasPassword()) {
      throw new InvalidLinkTokenError();
    }

    const passwordIsValid = await this.passwordHasher.compare(
      input.password,
      credential.passwordHash!,
    );

    if (!passwordIsValid) {
      throw new InvalidCredentialsError();
    }

    if (!credential.isActive()) {
      throw new InactiveAccountError();
    }

    credential.linkOAuthProvider(linkToken.provider, linkToken.providerId);
    await this.credentialRepository.update(credential);
    await this.oauthLinkTokenRepository.markAsUsed(linkToken.id);

    const accessToken = await this.tokenService.sign({
      sub: credential.userId,
      email: credential.email,
      roles: credential.roles,
    });

    const generated = this.refreshTokenService.generate();
    await this.refreshTokenRepository.create({
      credentialId: credential.id,
      tokenHash: generated.tokenHash,
      familyId: generated.familyId,
      expiresAt: generated.expiresAt,
    });

    return {
      status: 'AUTHENTICATED',
      session: {
        accessToken,
        refreshToken: generated.token,
        userId: credential.userId,
        email: credential.email,
        roles: credential.roles,
        status: credential.status,
      },
    };
  }
}
