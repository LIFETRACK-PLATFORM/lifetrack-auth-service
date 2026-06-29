import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  EventPublisherPort,
  PublishEventInput,
} from '../../../domain/ports/event.publisher.port';
import { envs } from 'src/config/envs';

@Injectable()
export class NatsEventPublisher
  implements EventPublisherPort, OnModuleInit, OnModuleDestroy
{
  private readonly client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers,
      },
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  async publish<TPayload>(event: PublishEventInput<TPayload>): Promise<void> {
    const envelope = {
      eventId: crypto.randomUUID(),
      eventType: event.eventType,
      version: 1,
      occurredAt: new Date().toISOString(),
      producer: 'auth-service',
      correlationId: event.correlationId ?? crypto.randomUUID(),
      actorId: event.actorId,
      payload: event.payload,
    };

    await lastValueFrom(this.client.emit(event.eventType, envelope));
  }
}
