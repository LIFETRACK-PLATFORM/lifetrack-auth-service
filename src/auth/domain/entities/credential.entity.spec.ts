import {
  AuthRole,
  AuthProvider,
  CredentialEntity,
  CredentialStatus,
} from './credential.entity';

const baseProps = {
  userId: 'user-1',
  email: 'alice@lifetrack.dev',
  passwordHash: 'hashed-password',
  provider: AuthProvider.LOCAL,
  providerId: null,
  roles: [AuthRole.USER],
  status: CredentialStatus.ACTIVE,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CredentialEntity', () => {
  it('crea una credencial valida con sus props', () => {
    const credential = new CredentialEntity(baseProps);

    expect(credential.email).toBe(baseProps.email);
    expect(credential.userId).toBe(baseProps.userId);
    expect(credential.roles).toEqual([AuthRole.USER]);
  });

  it('lanza error si falta el email', () => {
    expect(() => new CredentialEntity({ ...baseProps, email: '' })).toThrow(
      'El email es obligatorio',
    );
  });

  it('lanza error si falta el passwordHash en credencial LOCAL', () => {
    expect(
      () =>
        new CredentialEntity({
          ...baseProps,
          passwordHash: null,
          provider: AuthProvider.LOCAL,
        }),
    ).toThrow('Las credenciales locales requieren hash de contraseña');
  });

  it('permite credencial OAuth sin passwordHash', () => {
    const credential = new CredentialEntity({
      ...baseProps,
      passwordHash: null,
      provider: AuthProvider.GOOGLE,
      providerId: 'google-sub-1',
    });
    expect(credential.hasPassword()).toBe(false);
    expect(credential.provider).toBe(AuthProvider.GOOGLE);
  });

  it('linkOAuthProvider() vincula un proveedor OAuth a una cuenta local', () => {
    const credential = new CredentialEntity(baseProps);
    credential.linkOAuthProvider(AuthProvider.GOOGLE, 'google-sub-1');
    expect(credential.provider).toBe(AuthProvider.GOOGLE);
    expect(credential.providerId).toBe('google-sub-1');
    expect(credential.hasPassword()).toBe(true);
  });

  it('lanza error si no tiene al menos un rol', () => {
    expect(() => new CredentialEntity({ ...baseProps, roles: [] })).toThrow(
      'Se requiere al menos un rol',
    );
  });

  it('isActive() retorna true cuando el status es ACTIVE', () => {
    const credential = new CredentialEntity(baseProps);
    expect(credential.isActive()).toBe(true);
  });

  it('isActive() retorna false cuando el status no es ACTIVE', () => {
    const credential = new CredentialEntity({
      ...baseProps,
      status: CredentialStatus.DISABLED,
    });
    expect(credential.isActive()).toBe(false);
  });

  it('hasRole() detecta correctamente si tiene un rol asignado', () => {
    const credential = new CredentialEntity({
      ...baseProps,
      roles: [AuthRole.USER, AuthRole.ADMIN],
    });

    expect(credential.hasRole(AuthRole.ADMIN)).toBe(true);
    expect(credential.hasRole(AuthRole.FAMILY_ADMIN)).toBe(false);
  });

  it('isLocked() retorna false sin lockedUntil', () => {
    const credential = new CredentialEntity(baseProps);
    expect(credential.isLocked()).toBe(false);
  });

  it('isLocked() retorna true con lockedUntil en el futuro', () => {
    const credential = new CredentialEntity({
      ...baseProps,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    expect(credential.isLocked()).toBe(true);
  });

  it('isLocked() retorna false con lockedUntil en el pasado', () => {
    const credential = new CredentialEntity({
      ...baseProps,
      lockedUntil: new Date(Date.now() - 60_000),
    });
    expect(credential.isLocked()).toBe(false);
  });

  it('registerFailedAttempt() incrementa el contador sin bloquear bajo el umbral', () => {
    const credential = new CredentialEntity(baseProps);
    credential.registerFailedAttempt(5, 60_000);
    expect(credential.failedLoginAttempts).toBe(1);
    expect(credential.isLocked()).toBe(false);
  });

  it('registerFailedAttempt() bloquea la cuenta al alcanzar el umbral', () => {
    const credential = new CredentialEntity({
      ...baseProps,
      failedLoginAttempts: 4,
    });
    credential.registerFailedAttempt(5, 60_000);
    expect(credential.failedLoginAttempts).toBe(5);
    expect(credential.isLocked()).toBe(true);
  });

  it('resetFailedAttempts() reinicia el contador y desbloquea', () => {
    const credential = new CredentialEntity({
      ...baseProps,
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    credential.resetFailedAttempts();
    expect(credential.failedLoginAttempts).toBe(0);
    expect(credential.isLocked()).toBe(false);
  });

  it('setPasswordHash() actualiza el hash de la contraseña', () => {
    const credential = new CredentialEntity(baseProps);
    credential.setPasswordHash('new-hash');
    expect(credential.passwordHash).toBe('new-hash');
  });
});
