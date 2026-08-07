import { AuthProvider } from '../entities/credential.entity';

export type OAuthProfile = {
  provider: AuthProvider;
  providerId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
};

export interface OAuthProviderPort {
  exchangeCodeForProfile(
    code: string,
    codeVerifier: string,
  ): Promise<OAuthProfile>;
}
