import { Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshUseCase } from './application/use-cases/refresh.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { ValidateTokenUseCase } from './application/use-cases/validate-token.use-case';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { ConfirmEmailUseCase } from './application/use-cases/confirm-email.use-case';
import { ResendVerificationUseCase } from './application/use-cases/resend-verification.use-case';
import { CleanupExpiredRegistrationsUseCase } from './application/use-cases/cleanup-expired-registrations.use-case';
import { GetSessionUseCase } from './application/use-cases/get-session.use-case';
import { LoginWithOAuthUseCase } from './application/use-cases/login-with-oauth.use-case';
import { LinkOAuthAccountUseCase } from './application/use-cases/link-oauth-account.use-case';
import { CleanupExpiredRegistrationsScheduler } from './infrastructure/adapters/scheduling/cleanup-expired-registrations.scheduler';
import {
  CREDENTIAL_REPOSITORY,
  EVENT_PUBLISHER,
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  REFRESH_TOKEN_REPOSITORY,
  REFRESH_TOKEN_SERVICE,
  EMAIL_SENDER,
  PASSWORD_RESET_TOKEN_REPOSITORY,
  EMAIL_VERIFICATION_TOKEN_REPOSITORY,
  GOOGLE_OAUTH_PROVIDER,
  GITHUB_OAUTH_PROVIDER,
  OAUTH_LINK_TOKEN_REPOSITORY,
} from './domain/ports/tokens';
import { PrismaCredentialRepository } from './infrastructure/adapters/persistence/prisma-credential.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/adapters/persistence/prisma-refresh-token.repository';
import { PrismaPasswordResetTokenRepository } from './infrastructure/adapters/persistence/prisma-password-reset-token.repository';
import { PrismaEmailVerificationTokenRepository } from './infrastructure/adapters/persistence/prisma-email-verification-token.repository';
import { PrismaOAuthLinkTokenRepository } from './infrastructure/adapters/persistence/prisma-oauth-link-token.repository';
import { GoogleOAuthAdapter } from './infrastructure/adapters/oauth/google-oauth.adapter';
import { GitHubOAuthAdapter } from './infrastructure/adapters/oauth/github-oauth.adapter';
import { BcryptPasswordHasher } from './infrastructure/adapters/security/bcrypt-password-hasher';
import { RefreshTokenCryptoService } from './infrastructure/adapters/security/refresh-token-crypto.service';
import { ResendEmailSender } from './infrastructure/adapters/email/resend-email-sender';
import { NatsEventPublisher } from './infrastructure/adapters/messaging/nats-event.publisher';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { JwtTokenService } from './infrastructure/adapters/security/jwt-token.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { envs } from '../config/envs';
import { parseDurationToMs } from '../shared/utils/parse-duration';
import type { CredentialRepositoryPort } from './domain/ports/credential.repository.port';
import type { PasswordHasherPort } from './domain/ports/password-hasher.port';
import type { EventPublisherPort } from './domain/ports/event.publisher.port';
import type { TokenServicePort } from './domain/ports/token.service.port';
import type { RefreshTokenRepositoryPort } from './domain/ports/refresh-token.repository.port';
import type { RefreshTokenServicePort } from './domain/ports/refresh-token.service.port';
import type { EmailSenderPort } from './domain/ports/email-sender.port';
import type { PasswordResetTokenRepositoryPort } from './domain/ports/password-reset-token.repository.port';
import type { EmailVerificationTokenRepositoryPort } from './domain/ports/email-verification-token.repository.port';
import type { OAuthLinkTokenRepositoryPort } from './domain/ports/oauth-link-token.repository.port';
import type { OAuthProviderPort } from './domain/ports/oauth-provider.port';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: envs.jwtSecret,
      signOptions: {
        expiresIn: envs.jwtAccessExpiresIn as JwtSignOptions['expiresIn'],
      },
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
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: REFRESH_TOKEN_SERVICE,
      useClass: RefreshTokenCryptoService,
    },
    {
      provide: EMAIL_SENDER,
      useClass: ResendEmailSender,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PrismaPasswordResetTokenRepository,
    },
    {
      provide: EMAIL_VERIFICATION_TOKEN_REPOSITORY,
      useClass: PrismaEmailVerificationTokenRepository,
    },
    {
      provide: OAUTH_LINK_TOKEN_REPOSITORY,
      useClass: PrismaOAuthLinkTokenRepository,
    },
    {
      provide: GOOGLE_OAUTH_PROVIDER,
      useClass: GoogleOAuthAdapter,
    },
    {
      provide: GITHUB_OAUTH_PROVIDER,
      useClass: GitHubOAuthAdapter,
    },
    {
      provide: RegisterUseCase,
      useFactory: (
        repo: CredentialRepositoryPort,
        hasher: PasswordHasherPort,
        publisher: EventPublisherPort,
        emailVerificationTokenRepository: EmailVerificationTokenRepositoryPort,
        emailSender: EmailSenderPort,
      ) =>
        new RegisterUseCase(
          repo,
          hasher,
          publisher,
          emailVerificationTokenRepository,
          emailSender,
          parseDurationToMs(envs.emailVerificationTokenTtl),
          envs.emailVerificationUrlBase,
        ),
      inject: [
        CREDENTIAL_REPOSITORY,
        PASSWORD_HASHER,
        EVENT_PUBLISHER,
        EMAIL_VERIFICATION_TOKEN_REPOSITORY,
        EMAIL_SENDER,
      ],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        repo: CredentialRepositoryPort,
        hasher: PasswordHasherPort,
        tokenService: TokenServicePort,
        refreshTokenService: RefreshTokenServicePort,
        refreshTokenRepository: RefreshTokenRepositoryPort,
      ) =>
        new LoginUseCase(
          repo,
          hasher,
          tokenService,
          refreshTokenService,
          refreshTokenRepository,
          envs.loginMaxAttempts,
          parseDurationToMs(envs.loginLockoutDuration),
        ),
      inject: [
        CREDENTIAL_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_SERVICE,
        REFRESH_TOKEN_SERVICE,
        REFRESH_TOKEN_REPOSITORY,
      ],
    },
    {
      provide: RefreshUseCase,
      useFactory: (
        refreshTokenRepository: RefreshTokenRepositoryPort,
        refreshTokenService: RefreshTokenServicePort,
        credentialRepository: CredentialRepositoryPort,
        tokenService: TokenServicePort,
      ) =>
        new RefreshUseCase(
          refreshTokenRepository,
          refreshTokenService,
          credentialRepository,
          tokenService,
        ),
      inject: [
        REFRESH_TOKEN_REPOSITORY,
        REFRESH_TOKEN_SERVICE,
        CREDENTIAL_REPOSITORY,
        TOKEN_SERVICE,
      ],
    },
    {
      provide: LogoutUseCase,
      useFactory: (
        refreshTokenRepository: RefreshTokenRepositoryPort,
        refreshTokenService: RefreshTokenServicePort,
      ) => new LogoutUseCase(refreshTokenRepository, refreshTokenService),
      inject: [REFRESH_TOKEN_REPOSITORY, REFRESH_TOKEN_SERVICE],
    },
    {
      provide: ValidateTokenUseCase,
      useFactory: (tokenService: TokenServicePort) =>
        new ValidateTokenUseCase(tokenService),
      inject: [TOKEN_SERVICE],
    },
    {
      provide: GetSessionUseCase,
      useFactory: (
        refreshTokenRepository: RefreshTokenRepositoryPort,
        refreshTokenService: RefreshTokenServicePort,
        credentialRepository: CredentialRepositoryPort,
      ) =>
        new GetSessionUseCase(
          refreshTokenRepository,
          refreshTokenService,
          credentialRepository,
        ),
      inject: [
        REFRESH_TOKEN_REPOSITORY,
        REFRESH_TOKEN_SERVICE,
        CREDENTIAL_REPOSITORY,
      ],
    },
    {
      provide: ForgotPasswordUseCase,
      useFactory: (
        credentialRepository: CredentialRepositoryPort,
        passwordResetTokenRepository: PasswordResetTokenRepositoryPort,
        emailSender: EmailSenderPort,
      ) =>
        new ForgotPasswordUseCase(
          credentialRepository,
          passwordResetTokenRepository,
          emailSender,
          parseDurationToMs(envs.passwordResetTokenTtl),
          envs.passwordResetUrlBase,
        ),
      inject: [
        CREDENTIAL_REPOSITORY,
        PASSWORD_RESET_TOKEN_REPOSITORY,
        EMAIL_SENDER,
      ],
    },
    {
      provide: ResetPasswordUseCase,
      useFactory: (
        passwordResetTokenRepository: PasswordResetTokenRepositoryPort,
        credentialRepository: CredentialRepositoryPort,
        hasher: PasswordHasherPort,
        refreshTokenRepository: RefreshTokenRepositoryPort,
      ) =>
        new ResetPasswordUseCase(
          passwordResetTokenRepository,
          credentialRepository,
          hasher,
          refreshTokenRepository,
        ),
      inject: [
        PASSWORD_RESET_TOKEN_REPOSITORY,
        CREDENTIAL_REPOSITORY,
        PASSWORD_HASHER,
        REFRESH_TOKEN_REPOSITORY,
      ],
    },
    {
      provide: ConfirmEmailUseCase,
      useFactory: (
        emailVerificationTokenRepository: EmailVerificationTokenRepositoryPort,
        credentialRepository: CredentialRepositoryPort,
      ) =>
        new ConfirmEmailUseCase(
          emailVerificationTokenRepository,
          credentialRepository,
        ),
      inject: [EMAIL_VERIFICATION_TOKEN_REPOSITORY, CREDENTIAL_REPOSITORY],
    },
    {
      provide: ResendVerificationUseCase,
      useFactory: (
        credentialRepository: CredentialRepositoryPort,
        emailVerificationTokenRepository: EmailVerificationTokenRepositoryPort,
        emailSender: EmailSenderPort,
      ) =>
        new ResendVerificationUseCase(
          credentialRepository,
          emailVerificationTokenRepository,
          emailSender,
          parseDurationToMs(envs.emailVerificationTokenTtl),
          envs.emailVerificationUrlBase,
        ),
      inject: [
        CREDENTIAL_REPOSITORY,
        EMAIL_VERIFICATION_TOKEN_REPOSITORY,
        EMAIL_SENDER,
      ],
    },
    {
      provide: CleanupExpiredRegistrationsUseCase,
      useFactory: (credentialRepository: CredentialRepositoryPort) =>
        new CleanupExpiredRegistrationsUseCase(
          credentialRepository,
          parseDurationToMs(envs.staleRegistrationTtl),
        ),
      inject: [CREDENTIAL_REPOSITORY],
    },
    CleanupExpiredRegistrationsScheduler,
    {
      provide: LoginWithOAuthUseCase,
      useFactory: (
        credentialRepository: CredentialRepositoryPort,
        oauthLinkTokenRepository: OAuthLinkTokenRepositoryPort,
        googleOAuthProvider: OAuthProviderPort,
        githubOAuthProvider: OAuthProviderPort,
        tokenService: TokenServicePort,
        refreshTokenService: RefreshTokenServicePort,
        refreshTokenRepository: RefreshTokenRepositoryPort,
        eventPublisher: EventPublisherPort,
      ) =>
        new LoginWithOAuthUseCase(
          credentialRepository,
          oauthLinkTokenRepository,
          googleOAuthProvider,
          githubOAuthProvider,
          tokenService,
          refreshTokenService,
          refreshTokenRepository,
          eventPublisher,
          parseDurationToMs(envs.oauthLinkTokenTtl),
        ),
      inject: [
        CREDENTIAL_REPOSITORY,
        OAUTH_LINK_TOKEN_REPOSITORY,
        GOOGLE_OAUTH_PROVIDER,
        GITHUB_OAUTH_PROVIDER,
        TOKEN_SERVICE,
        REFRESH_TOKEN_SERVICE,
        REFRESH_TOKEN_REPOSITORY,
        EVENT_PUBLISHER,
      ],
    },
    {
      provide: LinkOAuthAccountUseCase,
      useFactory: (
        oauthLinkTokenRepository: OAuthLinkTokenRepositoryPort,
        credentialRepository: CredentialRepositoryPort,
        hasher: PasswordHasherPort,
        tokenService: TokenServicePort,
        refreshTokenService: RefreshTokenServicePort,
        refreshTokenRepository: RefreshTokenRepositoryPort,
      ) =>
        new LinkOAuthAccountUseCase(
          oauthLinkTokenRepository,
          credentialRepository,
          hasher,
          tokenService,
          refreshTokenService,
          refreshTokenRepository,
        ),
      inject: [
        OAUTH_LINK_TOKEN_REPOSITORY,
        CREDENTIAL_REPOSITORY,
        PASSWORD_HASHER,
        TOKEN_SERVICE,
        REFRESH_TOKEN_SERVICE,
        REFRESH_TOKEN_REPOSITORY,
      ],
    },
  ],
})
export class AuthModule {}
