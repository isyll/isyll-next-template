import 'server-only'

import pino from 'pino'

import { env } from '@/env'

/**
 * Structured (JSON) application logger. Server-only — never import this from a
 * Client Component. Output is line-delimited JSON so it drops straight into any
 * log pipeline (Loki, CloudWatch, Datadog, ...). In dev, pipe it through
 * `pino-pretty` for readability: `pnpm dev | pino-pretty`.
 *
 * `pino` is kept external from the bundle via `serverExternalPackages` in
 * next.config.ts so its lazy transport/worker requires don't trip Turbopack.
 */
// When `SKIP_ENV_VALIDATION` is set (e.g. CI builds), @t3-oss/env-nextjs returns
// the raw environment unparsed, so Zod defaults are not applied and `LOG_LEVEL`
// can be undefined at runtime even though its type says otherwise. pino 10 throws
// on an undefined level, so widen the binding and fall back to the Zod default.
const level = env.LOG_LEVEL as typeof env.LOG_LEVEL | undefined

export const logger = pino({
  level: level ?? 'info',
  // Drop pid/hostname noise (null, not undefined); platforms add their own.
  base: null,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Never let credentials reach the logs, however an object is shaped.
  redact: {
    paths: [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[redacted]',
  },
})

export type Logger = typeof logger
