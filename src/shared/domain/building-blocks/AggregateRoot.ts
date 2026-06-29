import { Entity } from './Entity';

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: unknown[] = [];

  get domainEvents(): unknown[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: unknown): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
