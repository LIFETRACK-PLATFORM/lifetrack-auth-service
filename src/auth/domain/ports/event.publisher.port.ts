export type PublishEventInput<TPayload> = {
  eventType: string;
  actorId?: string;
  correlationId?: string;
  payload: TPayload;
};

export interface EventPublisherPort {
  publish<TPayload>(event: PublishEventInput<TPayload>): Promise<void>;
}
