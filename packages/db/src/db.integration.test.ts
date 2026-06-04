import { randomUUID } from 'node:crypto'

import { and, eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { db, withTransaction } from './client'
import { notDeleted, softDeletePatch } from './lib/soft-delete'
import { auditLogs, users } from './schema'

/**
 * Integration tests for the data-layer primitives that only make sense against
 * a real PostgreSQL with the migrations applied (soft-delete partial unique
 * index, the audit trigger, transaction rollback + actor attribution).
 *
 * They are GATED on DATABASE_URL: skipped locally and in the no-DB quality job,
 * runnable wherever a migrated database is available, e.g.:
 *
 *   DATABASE_URL=postgres://... pnpm --filter @workspace/db test
 */
const databaseUrl = process.env['DATABASE_URL']

describe.skipIf(!databaseUrl)('db integration (requires DATABASE_URL)', () => {
  const email = () => `it-${randomUUID()}@example.test`

  afterAll(async () => {
    await db.$client.end()
  })

  it('frees a soft-deleted email for reuse and hides the dead row', async () => {
    const shared = email()
    const deadId = randomUUID()
    const liveId = randomUUID()

    await db.insert(users).values({ id: deadId, name: 'Dead', email: shared })
    await db.update(users).set(softDeletePatch()).where(eq(users.id, deadId))
    // The partial unique index is scoped to live rows, so the email is free.
    await db.insert(users).values({ id: liveId, name: 'Live', email: shared })

    const live = await db
      .select()
      .from(users)
      .where(and(eq(users.email, shared), notDeleted(users)))
    expect(live).toHaveLength(1)
    expect(live[0]?.id).toBe(liveId)

    await db.delete(users).where(inArray(users.id, [deadId, liveId]))
  })

  it('records an attributed audit row for a watched-column change', async () => {
    const id = randomUUID()
    await db.insert(users).values({ id, name: 'Before', email: email() })

    await withTransaction(
      async (tx) => {
        await tx.update(users).set({ name: 'After' }).where(eq(users.id, id))
      },
      { actor: { id: 'operator-xyz', type: 'operator' } }
    )

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.tableName, 'users'), eq(auditLogs.rowId, id)))
    const update = logs.find((log) => log.operation === 'UPDATE')
    expect(update).toBeDefined()
    expect(update?.changedColumns).toContain('name')
    expect(update?.actorId).toBe('operator-xyz')
    expect(update?.actorType).toBe('operator')

    await db.delete(users).where(eq(users.id, id))
  })

  it('rolls back every write when the transaction throws', async () => {
    const id = randomUUID()

    await expect(
      withTransaction(async (tx) => {
        await tx.insert(users).values({ id, name: 'Rollback', email: email() })
        throw new Error('boom')
      })
    ).rejects.toThrow('boom')

    const found = await db.select().from(users).where(eq(users.id, id))
    expect(found).toHaveLength(0)
  })
})
