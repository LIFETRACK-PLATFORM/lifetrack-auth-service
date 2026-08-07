import { AggregateRoot } from '../../../shared/domain/building-blocks/AggregateRoot';
import {
  AccountAlreadyVerifiedError,
  InvalidCredentialDataError,
} from '../exceptions/auth.errors';

export enum AuthRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  FAMILY_ADMIN = 'FAMILY_ADMIN',
  FAMILY_MEMBER = 'FAMILY_MEMBER',
}

export enum CredentialStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

export function parseAuthProvider(value: string): AuthProvider {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'GOOGLE') {
    return AuthProvider.GOOGLE;
  }
  if (normalized === 'GITHUB') {
    return AuthProvider.GITHUB;
  }
  throw new InvalidCredentialDataError(
    `Proveedor OAuth no soportado: ${value}`,
  );
}

export type CredentialProps = {
  userId: string;
  email: string;
  passwordHash: string | null;
  provider: AuthProvider;
  providerId?: string | null;
  roles: AuthRole[];
  status: CredentialStatus;
  emailVerifiedAt?: Date | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class CredentialEntity extends AggregateRoot<CredentialProps> {
  constructor(props: CredentialProps, id?: string) {
    if (!props.email)
      throw new InvalidCredentialDataError('El email es obligatorio');
    if (props.provider === AuthProvider.LOCAL && !props.passwordHash) {
      throw new InvalidCredentialDataError(
        'Las credenciales locales requieren hash de contraseña',
      );
    }
    if (props.provider !== AuthProvider.LOCAL && !props.providerId) {
      throw new InvalidCredentialDataError(
        'Las credenciales OAuth requieren providerId',
      );
    }
    if (!props.roles?.length)
      throw new InvalidCredentialDataError('Se requiere al menos un rol');
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string | null {
    return this.props.passwordHash;
  }
  get provider(): AuthProvider {
    return this.props.provider;
  }
  get providerId(): string | null | undefined {
    return this.props.providerId;
  }
  get roles(): AuthRole[] {
    return this.props.roles;
  }
  get status(): CredentialStatus {
    return this.props.status;
  }
  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }
  get lockedUntil(): Date | null | undefined {
    return this.props.lockedUntil;
  }
  get emailVerifiedAt(): Date | null | undefined {
    return this.props.emailVerifiedAt;
  }

  isActive(): boolean {
    return this.props.status === CredentialStatus.ACTIVE;
  }

  isPendingVerification(): boolean {
    return this.props.status === CredentialStatus.PENDING_VERIFICATION;
  }

  isLocalProvider(): boolean {
    return this.props.provider === AuthProvider.LOCAL;
  }

  hasPassword(): boolean {
    return this.props.passwordHash !== null;
  }

  markEmailVerified(): void {
    if (this.props.status !== CredentialStatus.PENDING_VERIFICATION) {
      throw new AccountAlreadyVerifiedError();
    }
    this.props.status = CredentialStatus.ACTIVE;
    this.props.emailVerifiedAt = new Date();
  }

  hasRole(role: AuthRole): boolean {
    return this.props.roles.includes(role);
  }

  isLocked(): boolean {
    return (
      !!this.props.lockedUntil && this.props.lockedUntil.getTime() > Date.now()
    );
  }

  registerFailedAttempt(maxAttempts: number, lockoutDurationMs: number): void {
    this.props.failedLoginAttempts += 1;
    if (this.props.failedLoginAttempts >= maxAttempts) {
      this.props.lockedUntil = new Date(Date.now() + lockoutDurationMs);
    }
  }

  resetFailedAttempts(): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
  }

  setPasswordHash(passwordHash: string): void {
    this.props.passwordHash = passwordHash;
  }

  linkOAuthProvider(provider: AuthProvider, providerId: string): void {
    if (provider === AuthProvider.LOCAL) {
      throw new InvalidCredentialDataError(
        'No se puede vincular el proveedor LOCAL',
      );
    }
    if (!this.hasPassword()) {
      throw new InvalidCredentialDataError(
        'Solo cuentas con contraseña local pueden vincularse',
      );
    }
    this.props.provider = provider;
    this.props.providerId = providerId;
  }
}
