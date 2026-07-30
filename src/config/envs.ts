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
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required(),
    DATABASE_URL: joi.string().required(),
    JWT_SECRET: joi.string().min(32).required(),
    JWT_ACCESS_EXPIRES_IN: joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: joi.string().default('7d'),
    BCRYPT_SALT_ROUNDS: joi.number().default(12),
    LOGIN_MAX_ATTEMPTS: joi.number().default(5),
    LOGIN_LOCKOUT_DURATION: joi.string().default('15m'),
    PASSWORD_RESET_TOKEN_TTL: joi.string().default('15m'),
    PASSWORD_RESET_URL_BASE: joi
      .string()
      .default('http://localhost:3002/reset-password'),
    EMAIL_VERIFICATION_TOKEN_TTL: joi.string().default('24h'),
    EMAIL_VERIFICATION_URL_BASE: joi
      .string()
      .default('http://localhost:3002/confirm-email'),
    RESEND_API_KEY: joi.string().required(),
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
};
