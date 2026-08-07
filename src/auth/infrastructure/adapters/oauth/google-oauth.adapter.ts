import { Injectable } from '@nestjs/common';
import { AuthProvider } from '../../../domain/entities/credential.entity';
import { InvalidCredentialDataError } from '../../../domain/exceptions/auth.errors';
import type {
  OAuthProfile,
  OAuthProviderPort,
} from '../../../domain/ports/oauth-provider.port';
import { envs } from '../../../../config/envs';

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
};

@Injectable()
export class GoogleOAuthAdapter implements OAuthProviderPort {
  async exchangeCodeForProfile(
    code: string,
    codeVerifier: string,
  ): Promise<OAuthProfile> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: envs.googleClientId,
        client_secret: envs.googleClientSecret,
        redirect_uri: `${envs.oauthRedirectBaseUrl}/auth/google/callback`,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      throw new InvalidCredentialDataError(
        'No se pudo intercambiar el código OAuth de Google',
      );
    }

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    const profileResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );

    if (!profileResponse.ok) {
      throw new InvalidCredentialDataError(
        'No se pudo obtener el perfil de Google',
      );
    }

    const profile = (await profileResponse.json()) as GoogleUserInfo;

    return {
      provider: AuthProvider.GOOGLE,
      providerId: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified,
      name: profile.name,
    };
  }
}
