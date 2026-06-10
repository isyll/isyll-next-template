import 'server-only'

import {
  type FlagDefinition,
  flagDefinitionSchema,
  type FlagValueType,
  type JsonValue,
  type TargetingRule,
} from '@workspace/core'
import {
  type Actor,
  db,
  publishEvent,
  schema,
  withTransaction,
} from '@workspace/db'
import { asc, eq } from 'drizzle-orm'

import { logger } from '@/lib/logger'

import { invalidateFlagCache } from './cache'

/**
 * Data-access layer for `app.feature_flags`. Reads parse the stored JSON columns
 * back into the strict `@workspace/core` model (a malformed row is logged and
 * treated as "no override"). Writes are transactional, emit a
 * `feature_flag.changed` domain event (rollout metrics / audit), and invalidate
 * the cache so other instances pick up the change.
 */
const { featureFlags } = schema

type FeatureFlagRow = typeof featureFlags.$inferSelect

function toDefinition(row: FeatureFlagRow): FlagDefinition | null {
  const parsed = flagDefinitionSchema.safeParse({
    key: row.key,
    type: row.type,
    enabled: row.enabled,
    variants: row.variants,
    defaultVariant: row.defaultVariant,
    offVariant: row.offVariant,
    rules: row.rules,
  })
  if (!parsed.success) {
    logger.warn(
      { flag: row.key, issues: parsed.error.issues },
      '[feature-flags] ignoring malformed flag configuration'
    )
    return null
  }
  return parsed.data
}

/** Read one flag's configuration, or `null` when no row exists. */
export async function readFlag(key: string): Promise<FlagDefinition | null> {
  const [row] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1)
  return row ? toDefinition(row) : null
}

/** Read every configured flag (malformed rows are skipped), ordered by key. */
export async function readAllFlags(): Promise<FlagDefinition[]> {
  const rows = await db
    .select()
    .from(featureFlags)
    .orderBy(asc(featureFlags.key))
  return rows
    .map(toDefinition)
    .filter((definition): definition is FlagDefinition => definition !== null)
}

export interface WriteFlagInput {
  key: string
  type: FlagValueType
  description?: string | null
  enabled: boolean
  variants: Record<string, JsonValue>
  defaultVariant: string
  offVariant: string
  rules?: TargetingRule[]
}

/** Create or replace a flag's configuration. */
export async function writeFlag(
  input: WriteFlagInput,
  actor?: Actor
): Promise<void> {
  const values = {
    key: input.key,
    type: input.type,
    description: input.description ?? null,
    enabled: input.enabled,
    variants: input.variants,
    defaultVariant: input.defaultVariant,
    offVariant: input.offVariant,
    rules: input.rules ?? [],
  }

  await withTransaction(
    async (tx) => {
      const [existing] = await tx
        .select({ id: featureFlags.id })
        .from(featureFlags)
        .where(eq(featureFlags.key, input.key))
        .limit(1)

      await tx
        .insert(featureFlags)
        .values(values)
        .onConflictDoUpdate({
          target: featureFlags.key,
          set: {
            type: values.type,
            description: values.description,
            enabled: values.enabled,
            variants: values.variants,
            defaultVariant: values.defaultVariant,
            offVariant: values.offVariant,
            rules: values.rules,
          },
        })

      await publishEvent({
        type: 'feature_flag.changed',
        key: input.key,
        enabled: input.enabled,
        change: existing ? 'updated' : 'created',
        actorId: actor?.id ?? null,
      })
    },
    actor ? { actor } : undefined
  )

  await invalidateFlagCache(input.key)
}

/** Flip a flag's kill switch. Returns `false` when the flag does not exist. */
export async function setFlagEnabled(
  key: string,
  enabled: boolean,
  actor?: Actor
): Promise<boolean> {
  const updated = await withTransaction(
    async (tx) => {
      const [row] = await tx
        .update(featureFlags)
        .set({ enabled })
        .where(eq(featureFlags.key, key))
        .returning({ key: featureFlags.key })
      if (!row) return false

      await publishEvent({
        type: 'feature_flag.changed',
        key,
        enabled,
        change: 'updated',
        actorId: actor?.id ?? null,
      })
      return true
    },
    actor ? { actor } : undefined
  )

  if (updated) await invalidateFlagCache(key)
  return updated
}

/** Permanently remove a flag. Returns `false` when it did not exist. */
export async function removeFlag(key: string, actor?: Actor): Promise<boolean> {
  const removed = await withTransaction(
    async (tx) => {
      const [row] = await tx
        .delete(featureFlags)
        .where(eq(featureFlags.key, key))
        .returning({ enabled: featureFlags.enabled })
      if (!row) return false

      await publishEvent({
        type: 'feature_flag.changed',
        key,
        enabled: row.enabled,
        change: 'deleted',
        actorId: actor?.id ?? null,
      })
      return true
    },
    actor ? { actor } : undefined
  )

  if (removed) await invalidateFlagCache(key)
  return removed
}
