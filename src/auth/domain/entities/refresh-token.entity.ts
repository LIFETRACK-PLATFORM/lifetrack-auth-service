import { AggregateRoot } from '../../../shared/domain/building-blocks/AggregateRoot';

export type RefreshTokenProps = {
  credentialId: string;
  tokenHash: string;
  familyId: string;
  replacedById?: string | null;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
};

export class RefreshTokenEntity extends AggregateRoot<RefreshTokenProps> {
  constructor(props: RefreshTokenProps, id?: string) {
    super(props, id);
  }

  get credentialId(): string {
    return this.props.credentialId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get familyId(): string {
    return this.props.familyId;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get revokedAt(): Date | null | undefined {
    return this.props.revokedAt;
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  isRevoked(): boolean {
    return !!this.props.revokedAt;
  }
}
