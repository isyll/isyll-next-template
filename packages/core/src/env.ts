/**
 * Minimal, framework-agnostic environment validation. Server-side packages
 * (`@workspace/db`, `@workspace/auth`) use this to fail fast at boot with a
 * readable error. The Next.js app uses `@t3-oss/env-nextjs` instead, which
 * additionally guards the server/client boundary.
 */
import type * as z from 'zod'

export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined> = process.env
): z.infer<T> {
  const result = schema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`
      )
      .join('\n')
    throw new Error(`Invalid environment variables:\n${details}`)
  }
  return result.data
}
