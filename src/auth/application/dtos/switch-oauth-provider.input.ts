export type SwitchOAuthProviderInput = {
  refreshToken: string;
  provider: string;
  code: string;
  codeVerifier: string;
};
