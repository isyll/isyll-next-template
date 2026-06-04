import { type SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import { createTransactional } from './transaction'

interface Recorded {
  sql: string
  params: unknown[]
}

/**
 * A minimal in-memory stand-in for a Drizzle client/transaction so we can test
 * the AsyncLocalStorage composition + actor stamping without a database.
 */
function createHarness() {
  const dialect = new PgDialect()
  const executed: Recorded[] = []
  let transactionCalls = 0

  const tx = {
    execute: (query: SQL) => {
      const { sql: text, params } = dialect.sqlToQuery(query)
      executed.push({ sql: text, params })
      return Promise.resolve(undefined)
    },
    transaction: <T>(fn: (t: unknown) => Promise<T>): Promise<T> => fn(tx),
  }

  const base = {
    execute: () => Promise.resolve(undefined),
    transaction: <T>(fn: (t: unknown) => Promise<T>): Promise<T> => {
      transactionCalls += 1
      return fn(tx)
    },
  }

  return { base, tx, executed, transactionCalls: () => transactionCalls }
}

describe('createTransactional', () => {
  it('getDb returns the base client outside a transaction', () => {
    const { base } = createHarness()
    const { getDb } = createTransactional(base)
    expect(getDb()).toBe(base)
  })

  it('runs fn inside a transaction and exposes the tx via getDb', async () => {
    const { base, tx } = createHarness()
    const { getDb, withTransaction } = createTransactional(base)

    await withTransaction((received) => {
      expect(received).toBe(tx)
      expect(getDb()).toBe(tx)
      return Promise.resolve()
    })

    // Back outside, getDb falls back to base.
    expect(getDb()).toBe(base)
  })

  it('nested withTransaction joins the ambient transaction (no new BEGIN)', async () => {
    const harness = createHarness()
    const { withTransaction } = createTransactional(harness.base)

    await withTransaction(async (outer) => {
      const callsAfterOuter = harness.transactionCalls()
      await withTransaction((inner) => {
        expect(inner).toBe(outer)
        return Promise.resolve()
      })
      // Nested call reused the ambient tx — no extra base.transaction().
      expect(harness.transactionCalls()).toBe(callsAfterOuter)
    })

    expect(harness.transactionCalls()).toBe(1)
  })

  it('stamps the actor into transaction-local settings', async () => {
    const harness = createHarness()
    const { withTransaction } = createTransactional(harness.base)

    await withTransaction(() => Promise.resolve(), {
      actor: { id: 'operator-1', type: 'operator' },
    })

    expect(harness.executed).toHaveLength(2)
    expect(harness.executed[0]?.sql).toContain('set_config')
    expect(harness.executed[0]?.sql).toContain('app.actor_id')
    expect(harness.executed[0]?.params).toContain('operator-1')
    expect(harness.executed[1]?.sql).toContain('app.actor_type')
    expect(harness.executed[1]?.params).toContain('operator')
  })

  it('does not stamp anything when no actor is given', async () => {
    const harness = createHarness()
    const { withTransaction } = createTransactional(harness.base)

    await withTransaction(() => Promise.resolve())
    expect(harness.executed).toHaveLength(0)
  })

  it('propagates errors so the caller (and the real tx) can roll back', async () => {
    const { base } = createHarness()
    const { withTransaction } = createTransactional(base)

    await expect(
      withTransaction(() => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom')
  })
})
