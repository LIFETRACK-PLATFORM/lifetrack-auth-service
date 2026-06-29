export type TokenPayload = {
  sub: string;
  email: string;
  roles: string[];
};

export interface TokenServicePort {
  sign(payload: TokenPayload): Promise<string>;
  verify(token: string): Promise<TokenPayload>;
}
