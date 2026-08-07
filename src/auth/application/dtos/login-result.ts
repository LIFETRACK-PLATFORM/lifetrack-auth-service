import {
  AuthRole,
  AuthProvider,
  CredentialStatus,
} from '../../domain/entities/credential.entity';

export type AuthenticatedSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  roles: AuthRole[];
  status: CredentialStatus;
};

export type LoginResult =
  | { status: 'AUTHENTICATED'; session: AuthenticatedSession }
  | {
      status: 'ACCOUNT_LINK_REQUIRED';
      linkToken: string;
      provider: AuthProvider;
    };
