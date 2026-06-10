import { env } from '@/env'

export interface OtelConfig {
  /** Collector base URL; the `/v1/traces` path is appended by the bootstrap. */
  endpoint: string
  headers: Record<string, string>
  serviceName: string
}

/** Parse an OTLP `key=value,key2=value2` header string into a record. */
export function parseOtelHeaders(
  raw: string | undefined
): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!raw) return headers
  for (const pair of raw.split(',')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    const key = pair.slice(0, eq).trim()
    if (key) headers[key] = pair.slice(eq + 1).trim()
  }
  return headers
}

/** Resolve OTLP config from env, or `null` when tracing is disabled. */
export function getOtelConfig(): OtelConfig | null {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) return null
  return {
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: parseOtelHeaders(env.OTEL_EXPORTER_OTLP_HEADERS),
    serviceName: env.OTEL_SERVICE_NAME ?? 'web',
  }
}
