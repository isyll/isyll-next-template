import { parseEnv } from '@workspace/core/env'
import * as z from 'zod'

const dbEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      'DATABASE_URL must be a PostgreSQL connection string'
    ),
  // Optional read-replica follower. When set, standalone reads route here while
  // writes/transactions stay on DATABASE_URL. Unset = reads use the primary.
  DATABASE_REPLICA_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      'DATABASE_REPLICA_URL must be a PostgreSQL connection string'
    )
    .optional(),
})

export type DbEnv = z.infer<typeof dbEnvSchema>

/** Validate the database environment. Call from scripts/consumers, not at import. */
export function getDbEnv(): DbEnv {
  return parseEnv(dbEnvSchema)
}
