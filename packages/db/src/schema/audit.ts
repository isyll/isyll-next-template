import { sql } from 'drizzle-orm'
import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { appSchema } from './auth'

/**
 * Append-only change history. Rows are written exclusively by the
 * `app.record_audit()` SECURITY DEFINER trigger (see the audit migration); no
 * service role has INSERT/UPDATE/DELETE, only SELECT. For each audited table a
 * trigger passes its primary-key column and the "watched" columns; the trigger
 * records only the watched columns that actually changed, as an old→new JSONB
 * diff, attributed to the transaction's actor (`withTransaction({ actor })`).
 */
export const auditLogs = appSchema.table(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tableSchema: text('table_schema').notNull(),
    tableName: text('table_name').notNull(),
    rowId: text('row_id').notNull(),
    operation: text('operation', {
      enum: ['INSERT', 'UPDATE', 'DELETE'],
    }).notNull(),
    changedColumns: text('changed_columns')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    actorId: text('actor_id'),
    actorType: text('actor_type'),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(
      table.tableSchema,
      table.tableName,
      table.rowId
    ),
    index('audit_logs_occurred_at_idx').on(table.occurredAt),
  ]
)
