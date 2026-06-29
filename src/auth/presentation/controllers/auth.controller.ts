import { Controller, UseFilters } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { RegisterDto } from '../dtos/register.dto';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';
import { LoginDto } from '../dtos/login.dto';
import { LoginUseCase } from 'src/auth/application/use-cases/login.use-case';

@Controller()
@UseFilters(DomainExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @GrpcMethod('AuthService', 'Register')
  register(data: RegisterDto) {
    return this.registerUseCase.execute(data);
  }

  @GrpcMethod('AuthService', 'Login')
  login(data: LoginDto) {
    return this.loginUseCase.execute(data);
  }
}
