export type GeneratedRefreshToken = {
  token: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
};

export interface RefreshTokenServicePort {
  generate(familyId?: string): GeneratedRefreshToken;
  hash(token: string): string;
}
