import { AggregateRoot } from '../../../shared/domain/building-blocks/AggregateRoot';

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

export type CredentialProps = {
  userId: string;
  email: string;
  passwordHash: string;
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
    if (!props.email) throw new Error('Email is required');
    if (!props.passwordHash) throw new Error('Password hash is required');
    if (!props.roles?.length) throw new Error('At least one role is required');
    super(props, id);
  }

  get userId(): string {
    return this.props.userId;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
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

  markEmailVerified(): void {
    if (this.props.status !== CredentialStatus.PENDING_VERIFICATION) {
      throw new Error(
        'Solo una cuenta pendiente de verificación puede activarse por este medio',
      );
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
}
