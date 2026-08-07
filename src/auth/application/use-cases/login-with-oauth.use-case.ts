import { randomUUID, randomBytes, createHash } from 'crypto';
import {
  AuthProvider,
  AuthRole,
  CredentialEntity,
  CredentialStatus,
  parseAuthProvider,
} from '../../domain/entities/credential.entity';
import {
  InactiveAccountError,
  InvalidCredentialDataError,
  OAuthEmailAlreadyRegisteredError,
} from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { OAuthLinkTokenRepositoryPort } from '../../domain/ports/oauth-link-token.repository.port';
import type { OAuthProviderPort } from '../../domain/ports/oauth-provider.port';
import type { TokenServicePort } from '../../domain/ports/token.service.port';
import type { RefreshTokenServicePort } from '../../domain/ports/refresh-token.service.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { EventPublisherPort } from '../../domain/ports/event.publisher.port';
import type { LoginResult } from '../dtos/login-result';
import type { LoginWithOAuthInput } from '../dtos/login-with-oauth.input';

export class LoginWithOAuthUseCase {
  constructor(
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly oauthLinkTokenRepository: OAuthLinkTokenRepositoryPort,
    private readonly googleOAuthProvider: OAuthProviderPort,
    private readonly githubOAuthProvider: OAuthProviderPort,
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenService: RefreshTokenServicePort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly linkTokenTtlMs: number,
  ) {}

  async execute(input: LoginWithOAuthInput): Promise<LoginResult> {
    const oauthProvider = this.resolveProvider(input.provider);
    const profile = await oauthProvider.exchangeCodeForProfile(
      input.code,
      input.codeVerifier,
    );

    if (!profile.emailVerified) {
      throw new InvalidCredentialDataError(
        'El email del proveedor OAuth no está verificado',
      );
    }

    const existingByProvider = await this.credentialRepository.findByProvider(
      profile.provider,
      profile.providerId,
    );

    if (existingByProvider) {
      if (!existingByProvider.isActive()) {
        throw new InactiveAccountError();
      }
      return this.issueSession(existingByProvider);
    }

    const existingByEmail = await this.credentialRepository.findByEmail(
      profile.email,
    );

    if (existingByEmail?.isLocalProvider() && existingByEmail.hasPassword()) {
      const linkToken = await this.createLinkToken(
        existingByEmail.id,
        profile.provider,
        profile.providerId,
      );
      return {
        status: 'ACCOUNT_LINK_REQUIRED',
        linkToken,
        provider: profile.provider,
      };
    }

    if (existingByEmail) {
      throw new OAuthEmailAlreadyRegisteredError(
        profile.email,
        this.providerLabel(existingByEmail.provider),
      );
    }

    const userId = randomUUID();
    const credential = await this.credentialRepository.create({
      userId,
      email: profile.email,
      passwordHash: null,
      provider: profile.provider,
      providerId: profile.providerId,
      roles: [AuthRole.USER],
      status: CredentialStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });

    await this.eventPublisher.publish({
      eventType: 'auth.user_registered',
      actorId: userId,
      payload: {
        userId,
        email: credential.email,
        displayName: profile.name ?? profile.email,
        roles: credential.roles,
      },
    });

    return this.issueSession(credential);
  }

  private providerLabel(provider: AuthProvider): string {
    switch (provider) {
      case AuthProvider.GOOGLE:
        return 'Google';
      case AuthProvider.GITHUB:
        return 'GitHub';
      default:
        return 'email y contraseña';
    }
  }

  private resolveProvider(provider: string): OAuthProviderPort {
    switch (parseAuthProvider(provider)) {
      case AuthProvider.GOOGLE:
        return this.googleOAuthProvider;
      case AuthProvider.GITHUB:
        return this.githubOAuthProvider;
      default:
        throw new InvalidCredentialDataError(
          `Proveedor OAuth no soportado: ${provider}`,
        );
    }
  }

  private async createLinkToken(
    credentialId: string,
    provider: AuthProvider,
    providerId: string,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.oauthLinkTokenRepository.create({
      credentialId,
      provider,
      providerId,
      tokenHash,
      expiresAt: new Date(Date.now() + this.linkTokenTtlMs),
    });

    return token;
  }

  private async issueSession(
    credential: CredentialEntity,
  ): Promise<LoginResult> {
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
