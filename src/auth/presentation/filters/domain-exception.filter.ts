import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';
import {
  DomainError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InactiveAccountError,
  InvalidRefreshTokenError,
  InvalidAccessTokenError,
  AccountLockedError,
  InvalidPasswordResetTokenError,
  EmailNotVerifiedError,
  InvalidEmailVerificationTokenError,
} from '../../domain/exceptions/auth.errors';

type DomainErrorConstructor = new (...args: unknown[]) => DomainError;

const ERROR_CODE_MAP = new Map<DomainErrorConstructor, GrpcStatus>([
  [EmailAlreadyExistsError, GrpcStatus.ALREADY_EXISTS],
  [InvalidCredentialsError, GrpcStatus.UNAUTHENTICATED],
  [InactiveAccountError, GrpcStatus.UNAUTHENTICATED],
  [InvalidRefreshTokenError, GrpcStatus.UNAUTHENTICATED],
  [InvalidAccessTokenError, GrpcStatus.UNAUTHENTICATED],
  [AccountLockedError, GrpcStatus.RESOURCE_EXHAUSTED],
  [InvalidPasswordResetTokenError, GrpcStatus.UNAUTHENTICATED],
  [EmailNotVerifiedError, GrpcStatus.UNAUTHENTICATED],
  [InvalidEmailVerificationTokenError, GrpcStatus.UNAUTHENTICATED],
]);

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, _: ArgumentsHost): Observable<never> {
    const code =
      ERROR_CODE_MAP.get(exception.constructor as DomainErrorConstructor) ??
      GrpcStatus.INVALID_ARGUMENT;

    // No envolver en `new RpcException(...)`: el transporte gRPC de NestJS
    // reenvía el error de esta observable tal cual al callback de grpc-js,
    // que solo respeta `error.code` si es una propiedad directa del objeto
    // (ver server-call.js#serverErrorToStatus). Una instancia de RpcException
    // no expone `code` como propiedad propia (solo vía getError()), así que
    // el status real en el wire caía siempre a UNKNOWN.
    return throwError(() => ({ code, message: exception.message }));
  }
}
