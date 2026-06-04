import { AsyncLocalStorage } from 'node:async_hooks'

import { sql, type SQL } from 'drizzle-orm'

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
  withTransaction: <T>(
    fn: (tx: TDb) => Promise<T>,
    options?: TransactionOptions
  ) => Promise<T>
}

export function createTransactional<TDb extends TxCapable>(
  base: TDb
): Transactional<TDb> {
  const storage = new AsyncLocalStorage<TDb>()

  const getDb = (): TDb => storage.getStore() ?? base

  const withTransaction = async <T>(
    fn: (tx: TDb) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> => {
    const ambient = storage.getStore()
    if (ambient) return fn(ambient)

    return base.transaction(async (raw) => {
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
  }

  return { getDb, withTransaction }
}
