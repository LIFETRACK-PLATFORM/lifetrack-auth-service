import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';
import {
  DomainError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InactiveAccountError,
} from '../../domain/exceptions/auth.errors';

type DomainErrorConstructor = new (...args: unknown[]) => DomainError;

const ERROR_CODE_MAP = new Map<DomainErrorConstructor, GrpcStatus>([
  [EmailAlreadyExistsError, GrpcStatus.ALREADY_EXISTS],
  [InvalidCredentialsError, GrpcStatus.UNAUTHENTICATED],
  [InactiveAccountError, GrpcStatus.UNAUTHENTICATED],
]);

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, _: ArgumentsHost): Observable<never> {
    const code =
      ERROR_CODE_MAP.get(exception.constructor as DomainErrorConstructor) ??
      GrpcStatus.INVALID_ARGUMENT;

    return throwError(
      () => new RpcException({ code, message: exception.message }),
    );
  }
}
