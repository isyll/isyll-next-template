import { sql } from 'drizzle-orm'
import { index, jsonb, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { softDelete, timestamps } from './_helpers'
import { appSchema, users } from './auth'

/**
 * In-app notifications for end users (Drizzle mirror of the pure-SQL migration).
 * `read_at` null = unread; soft-deletable. Lives in the `app` schema. Most
 * writes come from server code / background jobs, never from the client.
 */
export const notifications = appSchema.table(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    data: jsonb('data')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    ...softDelete,
    ...timestamps,
  },
  (table) => [
    index('notifications_user_idx')
      .on(table.userId, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
    index('notifications_user_unread_idx')
      .on(table.userId)
      .where(sql`${table.readAt} is null and ${table.deletedAt} is null`),
  ]
)
