import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { dirname, join } from 'path';
import { spanishValidationExceptionFactory } from './shared/utils/spanish-validation-exception-factory';

const contractsProtoPath = (file: string) =>
  join(dirname(require.resolve('@lifetrack/contracts/package.json')), 'proto', file);

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'lifetrack.auth',
        protoPath: contractsProtoPath('auth.proto'),
        url: '0.0.0.0:50051',
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: spanishValidationExceptionFactory,
    }),
  );

  await app.listen();
}
void bootstrap();
