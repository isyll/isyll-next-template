import { AsyncLocalStorage } from 'node:async_hooks'

import { SpanStatusCode, trace } from '@opentelemetry/api'
import { sql, type SQL } from 'drizzle-orm'

/** Each top-level `withTransaction` is a `db.transaction` span (no-op when off). */
const tracer = trace.getTracer('workspace-db')

/**
 * Central, reusable transaction system for Drizzle.
 *
 * `createTransactional(client)` wraps any Drizzle client (the end-user `db`, the
 * isolated `adminDb`, or a future one) and returns:
 *
 *   - `withTransaction(fn, { actor })` — runs `fn` inside a single database
 *     transaction. Nested calls automatically join the ambient transaction (one
 *     atomic unit), so DAL functions compose without each opening their own.
 *     The optional `actor` is stamped into transaction-local settings
 *     (`app.actor_id` / `app.actor_type`) that the audit trigger reads, so every
 *     change made in the transaction is attributed. If anything throws — the
 *     work itself or the audit trigger — the whole transaction rolls back.
 *   - `getDb()` — the ambient transaction when called inside `withTransaction`,
 *     otherwise the base client. DAL helpers should read through `getDb()` so
 *     they transparently participate in an enclosing transaction.
 *   - `getReadDb()` — like `getDb()`, but outside a transaction it returns the
 *     read `replica` (falling back to the primary when none is configured).
 *     Inside a transaction it returns the ambient (primary) connection, so
 *     read-your-writes still holds. Standalone DAL reads should use this.
 */
export interface Actor {
  id: string
  type: 'user' | 'operator' | 'system'
}

export interface TransactionOptions {
  /** Recorded by the audit trigger as the author of the changes. */
  actor?: Actor
}

/** Minimal shape shared by a Drizzle client and a Drizzle transaction. */
interface TxCapable {
  transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>
  execute: (query: SQL) => Promise<unknown>
}

export interface Transactional<TDb> {
  getDb: () => TDb
  getReadDb: () => TDb
  withTransaction: <T>(
    fn: (tx: TDb) => Promise<T>,
    options?: TransactionOptions
  ) => Promise<T>
}

/**
 * @param base    Primary client — handles writes, transactions and any read
 *                that must see in-flight writes.
 * @param replica Read-only client for standalone reads. Defaults to `base`, so
 *                a single-database setup behaves exactly as before.
 */
export function createTransactional<TDb extends TxCapable>(
  base: TDb,
  replica: TDb = base
): Transactional<TDb> {
  const storage = new AsyncLocalStorage<TDb>()

  const getDb = (): TDb => storage.getStore() ?? base

  const getReadDb = (): TDb => storage.getStore() ?? replica

  const withTransaction = async <T>(
    fn: (tx: TDb) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> => {
    const ambient = storage.getStore()
    if (ambient) return fn(ambient)

    return tracer.startActiveSpan('db.transaction', async (span) => {
      if (options?.actor) span.setAttribute('db.actor_type', options.actor.type)
      try {
        const result = await base.transaction(async (raw) => {
          const tx = raw as TDb
          const actor = options?.actor
          if (actor) {
            // `true` => transaction-local; reset automatically at COMMIT/ROLLBACK.
            await tx.execute(
              sql`select set_config('app.actor_id', ${actor.id}, true)`
            )
            await tx.execute(
              sql`select set_config('app.actor_type', ${actor.type}, true)`
            )
          }
          return storage.run(tx, () => fn(tx))
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      } catch (error) {
        span.recordException(
          error instanceof Error ? error : new Error(String(error))
        )
        span.setStatus({ code: SpanStatusCode.ERROR })
        throw error
      } finally {
        span.end()
      }
    })
  }

  return { getDb, getReadDb, withTransaction }
}
