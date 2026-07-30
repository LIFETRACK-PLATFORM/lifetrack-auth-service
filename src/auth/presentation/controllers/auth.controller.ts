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
import { LoginUseCase } from 'src/auth/application/use-cases/login.use-case';
import { RefreshUseCase } from 'src/auth/application/use-cases/refresh.use-case';
import { LogoutUseCase } from 'src/auth/application/use-cases/logout.use-case';
import { ValidateTokenUseCase } from 'src/auth/application/use-cases/validate-token.use-case';
import { ForgotPasswordUseCase } from 'src/auth/application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from 'src/auth/application/use-cases/reset-password.use-case';
import { ConfirmEmailUseCase } from 'src/auth/application/use-cases/confirm-email.use-case';
import { GetSessionUseCase } from 'src/auth/application/use-cases/get-session.use-case';
import { MeDto } from '../dtos/me.dto';

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
    private readonly getSessionUseCase: GetSessionUseCase,
  ) {}

  @GrpcMethod('AuthService', 'Register')
  register(data: RegisterDto) {
    return this.registerUseCase.execute(data);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginDto) {
    return this.loginUseCase.execute(data);
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
}
