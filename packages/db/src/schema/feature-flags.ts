import type { FlagValueType, JsonValue, TargetingRule } from '@workspace/core'
import { sql } from 'drizzle-orm'
import { boolean, jsonb, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { timestamps } from './_helpers'
import { appSchema } from './auth'

/**
 * Runtime configuration for feature flags (Drizzle mirror of the pure-SQL
 * migration). One row per flag key. The `variants`/`rules` JSON columns are
 * typed against the `@workspace/core` evaluation model and validated on read by
 * the provider. Lives in the `app` schema; read at request time by the app role.
 */
export const featureFlags = appSchema.table(
  'feature_flags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: text('key').notNull(),
    description: text('description'),
    type: text('type').$type<FlagValueType>().notNull().default('boolean'),
    enabled: boolean('enabled').notNull().default(false),
    variants: jsonb('variants')
      .$type<Record<string, JsonValue>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    defaultVariant: text('default_variant').notNull(),
    offVariant: text('off_variant').notNull(),
    rules: jsonb('rules')
      .$type<TargetingRule[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (table) => [uniqueIndex('feature_flags_key_unique').on(table.key)]
)

export type FeatureFlagRow = typeof featureFlags.$inferSelect
export type NewFeatureFlagRow = typeof featureFlags.$inferInsert
