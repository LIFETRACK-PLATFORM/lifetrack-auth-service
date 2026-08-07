import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  NATS_SERVERS: string[];
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: number;
  LOGIN_MAX_ATTEMPTS: number;
  LOGIN_LOCKOUT_DURATION: string;
  PASSWORD_RESET_TOKEN_TTL: string;
  PASSWORD_RESET_URL_BASE: string;
  EMAIL_VERIFICATION_TOKEN_TTL: string;
  EMAIL_VERIFICATION_URL_BASE: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
  STALE_REGISTRATION_TTL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  OAUTH_REDIRECT_BASE_URL: string;
  OAUTH_LINK_TOKEN_TTL: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
    DATABASE_URL: joi.string().required(),
    JWT_SECRET: joi.string().min(32).required(),
    JWT_ACCESS_EXPIRES_IN: joi.string().required(),
    JWT_REFRESH_EXPIRES_IN: joi.string().required(),
    BCRYPT_SALT_ROUNDS: joi.number().required(),
    LOGIN_MAX_ATTEMPTS: joi.number().required(),
    LOGIN_LOCKOUT_DURATION: joi.string().required(),
    PASSWORD_RESET_TOKEN_TTL: joi.string().required(),
    PASSWORD_RESET_URL_BASE: joi.string().required(),
    EMAIL_VERIFICATION_TOKEN_TTL: joi.string().required(),
    EMAIL_VERIFICATION_URL_BASE: joi.string().required(),
    RESEND_API_KEY: joi.string().required(),
    RESEND_FROM_EMAIL: joi
      .string()
      .default('LifeTrack <onboarding@resend.dev>'),
    STALE_REGISTRATION_TTL: joi.string().default('30d'),
    GOOGLE_CLIENT_ID: joi.string().required(),
    GOOGLE_CLIENT_SECRET: joi.string().required(),
    GITHUB_CLIENT_ID: joi.string().required(),
    GITHUB_CLIENT_SECRET: joi.string().required(),
    OAUTH_REDIRECT_BASE_URL: joi.string().required(),
    OAUTH_LINK_TOKEN_TTL: joi.string().default('15m'),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
}) as { error: joi.ValidationError | undefined; value: EnvVars };

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  natsServers: envVars.NATS_SERVERS,
  databaseUrl: envVars.DATABASE_URL,
  jwtSecret: envVars.JWT_SECRET,
  jwtAccessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  bcryptSaltRounds: envVars.BCRYPT_SALT_ROUNDS,
  loginMaxAttempts: envVars.LOGIN_MAX_ATTEMPTS,
  loginLockoutDuration: envVars.LOGIN_LOCKOUT_DURATION,
  passwordResetTokenTtl: envVars.PASSWORD_RESET_TOKEN_TTL,
  passwordResetUrlBase: envVars.PASSWORD_RESET_URL_BASE,
  emailVerificationTokenTtl: envVars.EMAIL_VERIFICATION_TOKEN_TTL,
  emailVerificationUrlBase: envVars.EMAIL_VERIFICATION_URL_BASE,
  resendApiKey: envVars.RESEND_API_KEY,
  resendFromEmail: envVars.RESEND_FROM_EMAIL,
  staleRegistrationTtl: envVars.STALE_REGISTRATION_TTL,
  googleClientId: envVars.GOOGLE_CLIENT_ID,
  googleClientSecret: envVars.GOOGLE_CLIENT_SECRET,
  githubClientId: envVars.GITHUB_CLIENT_ID,
  githubClientSecret: envVars.GITHUB_CLIENT_SECRET,
  oauthRedirectBaseUrl: envVars.OAUTH_REDIRECT_BASE_URL,
  oauthLinkTokenTtl: envVars.OAUTH_LINK_TOKEN_TTL,
};
