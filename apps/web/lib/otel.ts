import {
  type Attributes,
  type Span,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api'

/**
 * Manual spans for the app's instrumented seams (Server Actions, the outbox
 * relay, scheduled jobs). Uses only `@opentelemetry/api`, so it resolves to the
 * no-op tracer (near-zero cost) unless a provider is registered — see
 * `server/observability/otel-bootstrap.ts`. The DAL is traced in `@workspace/db`.
 */
export const tracer = trace.getTracer('next-monorepo-template')

/** Run `fn` in an active span: records exceptions, sets status, ends the span. */
export function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Attributes
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    attributes ? { attributes } : {},
    async (span) => {
      try {
        const result = await fn(span)
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      } catch (error) {
        span.recordException(
          error instanceof Error ? error : new Error(String(error))
        )
        span.setStatus({ code: SpanStatusCode.ERROR })
        throw error
      } finally {
        span.end()
      }
    }
  )
}
