import { ValidateTokenUseCase } from './validate-token.use-case';
import { InvalidAccessTokenError } from '../../domain/exceptions/auth.errors';

function createTokenServiceMock() {
  return {
    sign: jest.fn(),
    verify: jest.fn(),
  };
}

describe('ValidateTokenUseCase', () => {
  let tokenService: ReturnType<typeof createTokenServiceMock>;
  let useCase: ValidateTokenUseCase;

  beforeEach(() => {
    tokenService = createTokenServiceMock();
    useCase = new ValidateTokenUseCase(tokenService);
  });

  it('retorna el payload cuando el access token es válido', async () => {
    tokenService.verify.mockResolvedValue({
      sub: 'user-1',
      email: 'alice@lifetrack.dev',
      roles: ['USER'],
    });

    const result = await useCase.execute({ accessToken: 'valid-token' });

    expect(result).toEqual({
      sub: 'user-1',
      email: 'alice@lifetrack.dev',
      roles: ['USER'],
    });
  });

  it('lanza un error genérico sin detalles internos cuando el token es inválido', async () => {
    tokenService.verify.mockRejectedValue(
      new Error('jwt malformed: unexpected token at position 12'),
    );

    await expect(useCase.execute({ accessToken: 'bad-token' })).rejects.toThrow(
      InvalidAccessTokenError,
    );
  });

  it('lanza un error genérico cuando el token está expirado', async () => {
    tokenService.verify.mockRejectedValue(new Error('jwt expired'));

    await expect(
      useCase.execute({ accessToken: 'expired-token' }),
    ).rejects.toThrow(InvalidAccessTokenError);
  });
});
