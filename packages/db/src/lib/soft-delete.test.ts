import { eq } from 'drizzle-orm'
import { PgDialect, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'

import {
  liveWhere,
  notDeleted,
  onlyDeleted,
  restorePatch,
  softDeletePatch,
} from './soft-delete'

const widgets = pgTable('widgets', {
  id: text('id').primaryKey(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
})

const dialect = new PgDialect()
const toSql = (fragment: Parameters<typeof dialect.sqlToQuery>[0]): string =>
  dialect.sqlToQuery(fragment).sql.toLowerCase()

describe('soft-delete query fragments', () => {
  it('notDeleted matches live rows (deleted_at IS NULL)', () => {
    const sql = toSql(notDeleted(widgets))
    expect(sql).toContain('deleted_at')
    expect(sql).toContain('is null')
    expect(sql).not.toContain('is not null')
  })

  it('onlyDeleted matches soft-deleted rows (deleted_at IS NOT NULL)', () => {
    expect(toSql(onlyDeleted(widgets))).toContain('is not null')
  })

  it('liveWhere ANDs notDeleted with extra conditions', () => {
    const fragment = liveWhere(widgets, eq(widgets.id, 'abc'))
    if (!fragment) throw new Error('expected a SQL fragment')
    const { sql, params } = dialect.sqlToQuery(fragment)
    expect(sql.toLowerCase()).toContain('is null')
    expect(sql.toLowerCase()).toContain('and')
    expect(params).toContain('abc')
  })

  it('liveWhere with no extra conditions is just notDeleted', () => {
    const fragment = liveWhere(widgets)
    if (!fragment) throw new Error('expected a SQL fragment')
    expect(toSql(fragment)).toContain('is null')
  })
})

describe('soft-delete mutation patches', () => {
  it('softDeletePatch stamps deleted_at with the current time', () => {
    const { deletedAt } = softDeletePatch()
    expect(deletedAt).toBeInstanceOf(Date)
    expect(Math.abs(Date.now() - deletedAt.getTime())).toBeLessThan(2000)
  })

  it('restorePatch clears deleted_at', () => {
    expect(restorePatch()).toEqual({ deletedAt: null })
  })
})
