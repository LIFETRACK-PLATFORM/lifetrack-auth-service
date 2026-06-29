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
