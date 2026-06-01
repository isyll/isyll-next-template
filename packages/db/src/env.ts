import { parseEnv } from '@workspace/core/env'
import * as z from 'zod'

const dbEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      'DATABASE_URL must be a PostgreSQL connection string'
    ),
})

export type DbEnv = z.infer<typeof dbEnvSchema>

/** Validate the database environment. Call from scripts/consumers, not at import. */
export function getDbEnv(): DbEnv {
  return parseEnv(dbEnvSchema)
}
