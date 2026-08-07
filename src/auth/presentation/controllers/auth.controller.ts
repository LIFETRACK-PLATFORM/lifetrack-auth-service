import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { RegisterDto } from '../dtos/register.dto';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { LoginDto } from '../dtos/login.dto';
import { RefreshDto } from '../dtos/refresh.dto';
import { LogoutDto } from '../dtos/logout.dto';
import { ValidateTokenDto } from '../dtos/validate-token.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ConfirmEmailDto } from '../dtos/confirm-email.dto';
import { ResendVerificationDto } from '../dtos/resend-verification.dto';
import { LoginUseCase } from 'src/auth/application/use-cases/login.use-case';
import { RefreshUseCase } from 'src/auth/application/use-cases/refresh.use-case';
import { LogoutUseCase } from 'src/auth/application/use-cases/logout.use-case';
import { ValidateTokenUseCase } from 'src/auth/application/use-cases/validate-token.use-case';
import { ForgotPasswordUseCase } from 'src/auth/application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from 'src/auth/application/use-cases/reset-password.use-case';
import { ConfirmEmailUseCase } from 'src/auth/application/use-cases/confirm-email.use-case';
import { ResendVerificationUseCase } from 'src/auth/application/use-cases/resend-verification.use-case';
import { GetSessionUseCase } from 'src/auth/application/use-cases/get-session.use-case';
import { LoginWithOAuthUseCase } from 'src/auth/application/use-cases/login-with-oauth.use-case';
import { LinkOAuthAccountUseCase } from 'src/auth/application/use-cases/link-oauth-account.use-case';
import { SwitchOAuthProviderUseCase } from 'src/auth/application/use-cases/switch-oauth-provider.use-case';
import { MeDto } from '../dtos/me.dto';
import { LoginWithOAuthDto } from '../dtos/login-with-oauth.dto';
import { LinkOAuthAccountDto } from '../dtos/link-oauth-account.dto';
import { SwitchOAuthProviderDto } from '../dtos/switch-oauth-provider.dto';

@Controller()
@UseFilters(DomainExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly validateTokenUseCase: ValidateTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly confirmEmailUseCase: ConfirmEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly loginWithOAuthUseCase: LoginWithOAuthUseCase,
    private readonly linkOAuthAccountUseCase: LinkOAuthAccountUseCase,
    private readonly switchOAuthProviderUseCase: SwitchOAuthProviderUseCase,
  ) {}

  @GrpcMethod('AuthService', 'Register')
  register(data: RegisterDto) {
    return this.registerUseCase.execute(data);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(data: LoginDto) {
    const result = await this.loginUseCase.execute(data);
    if (result.status !== 'AUTHENTICATED') {
      throw new Error('Estado de login inesperado');
    }
    return result.session;
  }

  @GrpcMethod('AuthService', 'Refresh')
  refresh(data: RefreshDto) {
    return this.refreshUseCase.execute(data);
  }

  @GrpcMethod('AuthService', 'Logout')
  async logout(data: LogoutDto) {
    await this.logoutUseCase.execute(data);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  validateToken(data: ValidateTokenDto) {
    return this.validateTokenUseCase.execute(data);
  }

  @GrpcMethod('AuthService', 'Me')
  me(data: MeDto) {
    return this.getSessionUseCase.execute(data);
  }

  @GrpcMethod('AuthService', 'ForgotPassword')
  async forgotPassword(data: ForgotPasswordDto) {
    await this.forgotPasswordUseCase.execute(data);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'ResetPassword')
  async resetPassword(data: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute(data);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'ConfirmEmail')
  async confirmEmail(data: ConfirmEmailDto) {
    await this.confirmEmailUseCase.execute(data);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'ResendVerification')
  async resendVerification(data: ResendVerificationDto) {
    await this.resendVerificationUseCase.execute(data);
    return { success: true };
  }

  @GrpcMethod('AuthService', 'LoginWithOAuth')
  async loginWithOAuth(data: LoginWithOAuthDto) {
    const result = await this.loginWithOAuthUseCase.execute(data);
    if (result.status === 'AUTHENTICATED') {
      return {
        status: result.status,
        accessToken: result.session.accessToken,
        refreshToken: result.session.refreshToken,
        userId: result.session.userId,
        email: result.session.email,
        roles: result.session.roles,
        credentialStatus: result.session.status,
      };
    }
    return {
      status: result.status,
      linkToken: result.linkToken,
      provider: result.provider,
    };
  }

  @GrpcMethod('AuthService', 'LinkOAuthAccount')
  async linkOAuthAccount(data: LinkOAuthAccountDto) {
    const result = await this.linkOAuthAccountUseCase.execute(data);
    if (result.status !== 'AUTHENTICATED') {
      throw new Error('Estado de vinculación inesperado');
    }
    return result.session;
  }

  @GrpcMethod('AuthService', 'SwitchOAuthProvider')
  switchOAuthProvider(data: SwitchOAuthProviderDto) {
    return this.switchOAuthProviderUseCase.execute(data);
  }
}
