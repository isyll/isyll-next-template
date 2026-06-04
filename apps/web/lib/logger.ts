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
export const logger = pino({
  level: env.LOG_LEVEL,
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
