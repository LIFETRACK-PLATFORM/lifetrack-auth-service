import { AuthRole } from '../../domain/entities/credential.entity';

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  roles?: AuthRole[];
};
