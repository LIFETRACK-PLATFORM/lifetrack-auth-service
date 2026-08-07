export abstract class DomainError extends Error {}

export class EmailAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`El email ${email} ya está registrado`);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Credenciales inválidas');
  }
}

export class InactiveAccountError extends DomainError {
  constructor() {
    super('La cuenta no está activa');
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor() {
    super('Sesión inválida, inicia sesión nuevamente');
  }
}

export class InvalidAccessTokenError extends DomainError {
  constructor() {
    super('Token inválido');
  }
}

export class AccountLockedError extends DomainError {
  constructor() {
    super(
      'La cuenta está bloqueada temporalmente. Intenta nuevamente más tarde',
    );
  }
}

export class InvalidPasswordResetTokenError extends DomainError {
  constructor() {
    super('El enlace de restablecimiento no es válido o ya expiró');
  }
}

export class EmailNotVerifiedError extends DomainError {
  constructor() {
    super('Debes confirmar tu email antes de iniciar sesión');
  }
}

export class InvalidEmailVerificationTokenError extends DomainError {
  constructor() {
    super('El enlace de confirmación no es válido o ya expiró');
  }
}

export class InvalidCredentialDataError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

export class AccountAlreadyVerifiedError extends DomainError {
  constructor() {
    super(
      'Solo una cuenta pendiente de verificación puede activarse por este medio',
    );
  }
}

export class AccountLinkRequiredError extends DomainError {
  constructor() {
    super('Se requiere vincular la cuenta OAuth con tu cuenta local existente');
  }
}

export class InvalidLinkTokenError extends DomainError {
  constructor() {
    super('El enlace de vinculación no es válido o ya expiró');
  }
}

export class NoPasswordSetError extends DomainError {
  constructor() {
    super('Credenciales inválidas');
  }
}

export class OAuthEmailAlreadyRegisteredError extends DomainError {
  constructor(email: string, existingProvider: string) {
    super(
      `Ya existe una cuenta con el email ${email} registrada con ${existingProvider}. Inicia sesión con ese proveedor.`,
    );
  }
}

export class OAuthEmailMismatchError extends DomainError {
  constructor() {
    super(
      'El email verificado por el proveedor no coincide con el de tu cuenta actual',
    );
  }
}

export class OAuthIdentityAlreadyLinkedError extends DomainError {
  constructor(existingProvider: string) {
    super(`Esa cuenta de ${existingProvider} ya está vinculada a otro usuario`);
  }
}
