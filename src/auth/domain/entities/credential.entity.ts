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

  isActive(): boolean {
    return this.props.status === CredentialStatus.ACTIVE;
  }

  hasRole(role: AuthRole): boolean {
    return this.props.roles.includes(role);
  }
}
