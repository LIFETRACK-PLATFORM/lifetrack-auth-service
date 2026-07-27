import { InvalidAccessTokenError } from '../../domain/exceptions/auth.errors';
import type { TokenServicePort } from '../../domain/ports/token.service.port';
import type { ValidateTokenInput } from '../dtos/validate-token.input';

export class ValidateTokenUseCase {
  constructor(private readonly tokenService: TokenServicePort) {}

  async execute(input: ValidateTokenInput) {
    try {
      const payload = await this.tokenService.verify(input.accessToken);
      return {
        sub: payload.sub,
        email: payload.email,
        roles: payload.roles,
      };
    } catch {
      throw new InvalidAccessTokenError();
    }
  }
}
