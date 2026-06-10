export { db, type DB, getDb, withTransaction } from './client'
export * as schema from './schema'
export * from './validators'
export * from './lib/soft-delete'
export * from './lib/search'
export {
  publishEvent,
  buildOutboxEvent,
  type DomainEvent,
  type DomainEventType,
  type UserRegisteredEvent,
  type UserNewConnectionEvent,
  type FeatureFlagChangedEvent,
} from './lib/events'
export {
  createTransactional,
  type Actor,
  type TransactionOptions,
  type Transactional,
} from './lib/transaction'
export { getDbEnv, type DbEnv } from './env'
export type {
  OutboxEvent,
  NewOutboxEvent,
  OutboxEventStatus,
} from './schema/events'
