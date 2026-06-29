import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import {
  CREDENTIAL_REPOSITORY,
  EVENT_PUBLISHER,
  PASSWORD_HASHER,
  TOKEN_SERVICE,
} from './domain/ports/tokens';
import { PrismaCredentialRepository } from './infrastructure/adapters/persistence/prisma-credential.repository';
import { BcryptPasswordHasher } from './infrastructure/adapters/security/bcrypt-password-hasher';
import { NatsEventPublisher } from './infrastructure/adapters/messaging/nats-event.publisher';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { JwtTokenService } from './infrastructure/adapters/security/jwt-token.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { envs } from '../config/envs';
import type { CredentialRepositoryPort } from './domain/ports/credential.repository.port';
import type { PasswordHasherPort } from './domain/ports/password-hasher.port';
import type { EventPublisherPort } from './domain/ports/event.publisher.port';
import type { TokenServicePort } from './domain/ports/token.service.port';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    {
      provide: CREDENTIAL_REPOSITORY,
      useClass: PrismaCredentialRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    {
      provide: EVENT_PUBLISHER,
      useClass: NatsEventPublisher,
    },
    {
      provide: RegisterUseCase,
      useFactory: (
        repo: CredentialRepositoryPort,
        hasher: PasswordHasherPort,
        publisher: EventPublisherPort,
      ) => new RegisterUseCase(repo, hasher, publisher),
      inject: [CREDENTIAL_REPOSITORY, PASSWORD_HASHER, EVENT_PUBLISHER],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        repo: CredentialRepositoryPort,
        hasher: PasswordHasherPort,
        tokenService: TokenServicePort,
      ) => new LoginUseCase(repo, hasher, tokenService),
      inject: [CREDENTIAL_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
    },
  ],
})
export class AuthModule {}
