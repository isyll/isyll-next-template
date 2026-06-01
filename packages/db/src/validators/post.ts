import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod'
import type * as z from 'zod'

import { post } from '../schema/post'

export const postSelectSchema = createSelectSchema(post)

export const postInsertSchema = createInsertSchema(post, {
  title: (schema) => schema.min(1).max(200),
  content: (schema) => schema.max(10_000),
})

export const postUpdateSchema = createUpdateSchema(post, {
  title: (schema) => schema.min(1).max(200),
  content: (schema) => schema.max(10_000),
})

/** DTO derived from the table — single source of truth. */
export type Post = z.infer<typeof postSelectSchema>
export type NewPost = z.infer<typeof postInsertSchema>
export type PostPatch = z.infer<typeof postUpdateSchema>

/** Pure row types (no validation) for read paths. */
export type PostRow = typeof post.$inferSelect
export type PostInsert = typeof post.$inferInsert
