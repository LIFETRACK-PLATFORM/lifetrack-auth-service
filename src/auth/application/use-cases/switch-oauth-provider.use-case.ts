import {
  AuthProvider,
  parseAuthProvider,
} from '../../domain/entities/credential.entity';
import {
  InactiveAccountError,
  InvalidCredentialDataError,
  InvalidRefreshTokenError,
  OAuthEmailMismatchError,
  OAuthIdentityAlreadyLinkedError,
} from '../../domain/exceptions/auth.errors';
import type { CredentialRepositoryPort } from '../../domain/ports/credential.repository.port';
import type { OAuthProviderPort } from '../../domain/ports/oauth-provider.port';
import type { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token.repository.port';
import type { RefreshTokenServicePort } from '../../domain/ports/refresh-token.service.port';
import type { SwitchOAuthProviderInput } from '../dtos/switch-oauth-provider.input';

export type SwitchOAuthProviderResult = {
  status: 'PROVIDER_SWITCHED';
  provider: AuthProvider;
};

export class SwitchOAuthProviderUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
    private readonly refreshTokenService: RefreshTokenServicePort,
    private readonly credentialRepository: CredentialRepositoryPort,
    private readonly googleOAuthProvider: OAuthProviderPort,
    private readonly githubOAuthProvider: OAuthProviderPort,
  ) {}

  async execute(
    input: SwitchOAuthProviderInput,
  ): Promise<SwitchOAuthProviderResult> {
    const credential = await this.resolveSessionCredential(
      input.refreshToken,
    );

    const provider = parseAuthProvider(input.provider);
    const oauthProvider = this.resolveProvider(provider);
    const profile = await oauthProvider.exchangeCodeForProfile(
      input.code,
      input.codeVerifier,
    );

    if (!profile.emailVerified) {
      throw new InvalidCredentialDataError(
        'El email del proveedor OAuth no está verificado',
      );
    }

    if (profile.email !== credential.email) {
      throw new OAuthEmailMismatchError();
    }

    const existingByProvider = await this.credentialRepository.findByProvider(
      profile.provider,
      profile.providerId,
    );

    if (existingByProvider && existingByProvider.id !== credential.id) {
      throw new OAuthIdentityAlreadyLinkedError(profile.provider);
    }

    credential.linkOAuthProvider(profile.provider, profile.providerId);
    await this.credentialRepository.update(credential);

    return { status: 'PROVIDER_SWITCHED', provider: profile.provider };
  }

  private async resolveSessionCredential(refreshToken: string) {
    const tokenHash = this.refreshTokenService.hash(refreshToken);
    const existing =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existing || existing.isRevoked() || existing.isExpired()) {
      throw new InvalidRefreshTokenError();
    }

    const credential = await this.credentialRepository.findById(
      existing.credentialId,
    );

    if (!credential) {
      throw new InvalidRefreshTokenError();
    }

    if (!credential.isActive()) {
      throw new InactiveAccountError();
    }

    return credential;
  }

  private resolveProvider(provider: AuthProvider): OAuthProviderPort {
    switch (provider) {
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
}
