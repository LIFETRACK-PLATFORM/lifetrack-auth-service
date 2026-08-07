import { Injectable } from '@nestjs/common';
import { AuthProvider } from '../../../domain/entities/credential.entity';
import { InvalidCredentialDataError } from '../../../domain/exceptions/auth.errors';
import type {
  OAuthProfile,
  OAuthProviderPort,
} from '../../../domain/ports/oauth-provider.port';
import { envs } from '../../../../config/envs';

type GitHubTokenResponse = {
  access_token: string;
  token_type: string;
};

type GitHubUser = {
  id: number;
  email: string | null;
  name?: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

@Injectable()
export class GitHubOAuthAdapter implements OAuthProviderPort {
  async exchangeCodeForProfile(
    code: string,
    codeVerifier: string,
  ): Promise<OAuthProfile> {
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          code,
          client_id: envs.githubClientId,
          client_secret: envs.githubClientSecret,
          redirect_uri: `${envs.oauthRedirectBaseUrl}/auth/github/callback`,
          code_verifier: codeVerifier,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new InvalidCredentialDataError(
        'No se pudo intercambiar el código OAuth de GitHub',
      );
    }

    const tokens = (await tokenResponse.json()) as GitHubTokenResponse;
    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!profileResponse.ok) {
      throw new InvalidCredentialDataError(
        'No se pudo obtener el perfil de GitHub',
      );
    }

    const profile = (await profileResponse.json()) as GitHubUser;
    const emailInfo = await this.resolveEmail(tokens.access_token, profile.email);

    return {
      provider: AuthProvider.GITHUB,
      providerId: String(profile.id),
      email: emailInfo.email,
      emailVerified: emailInfo.verified,
      name: profile.name ?? undefined,
    };
  }

  private async resolveEmail(
    accessToken: string,
    profileEmail: string | null,
  ): Promise<{ email: string; verified: boolean }> {
    if (profileEmail) {
      return { email: profileEmail, verified: true };
    }

    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!emailsResponse.ok) {
      throw new InvalidCredentialDataError(
        'No se pudo obtener el email de GitHub',
      );
    }

    const emails = (await emailsResponse.json()) as GitHubEmail[];
    const primaryVerified = emails.find(
      (entry) => entry.primary && entry.verified,
    );
    const anyVerified = emails.find((entry) => entry.verified);

    const selected = primaryVerified ?? anyVerified;
    if (!selected) {
      throw new InvalidCredentialDataError(
        'GitHub no expone un email verificado para esta cuenta',
      );
    }

    return { email: selected.email, verified: selected.verified };
  }
}
