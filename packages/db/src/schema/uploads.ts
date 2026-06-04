import { sql } from 'drizzle-orm'
import { bigint, index, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { softDelete, timestamps } from './_helpers'
import { appSchema, users } from './auth'

/**
 * Metadata for files in S3-compatible object storage (Drizzle mirror of the
 * pure-SQL migration). The bytes live in the bucket; this table records who
 * owns each object and how to find it. Soft-deletable.
 */
export const uploads = appSchema.table(
  'uploads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bucket: text('bucket').notNull(),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    originalName: text('original_name'),
    ...softDelete,
    ...timestamps,
  },
  (table) => [
    uniqueIndex('uploads_object_key_unique')
      .on(table.bucket, table.objectKey)
      .where(sql`${table.deletedAt} is null`),
    index('uploads_user_idx')
      .on(table.userId, table.createdAt)
      .where(sql`${table.deletedAt} is null`),
  ]
)
