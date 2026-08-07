import { AggregateRoot } from '../../../shared/domain/building-blocks/AggregateRoot';
import { AuthProvider } from './credential.entity';

export type OAuthLinkTokenProps = {
  credentialId: string;
  provider: AuthProvider;
  providerId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
};

export class OAuthLinkTokenEntity extends AggregateRoot<OAuthLinkTokenProps> {
  constructor(props: OAuthLinkTokenProps, id?: string) {
    super(props, id);
  }

  get credentialId(): string {
    return this.props.credentialId;
  }
  get provider(): AuthProvider {
    return this.props.provider;
  }
  get providerId(): string {
    return this.props.providerId;
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
