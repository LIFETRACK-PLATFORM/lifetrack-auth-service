import { AggregateRoot } from '../../../shared/domain/building-blocks/AggregateRoot';

export type PasswordResetTokenProps = {
  credentialId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
};

export class PasswordResetTokenEntity extends AggregateRoot<PasswordResetTokenProps> {
  constructor(props: PasswordResetTokenProps, id?: string) {
    super(props, id);
  }

  get credentialId(): string {
    return this.props.credentialId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get usedAt(): Date | null | undefined {
    return this.props.usedAt;
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  isUsed(): boolean {
    return !!this.props.usedAt;
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isUsed();
  }
}
