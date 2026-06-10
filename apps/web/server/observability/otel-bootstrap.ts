import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

import { logger } from '@/lib/logger'
import { getOtelConfig } from '@/lib/otel-config'

/**
 * OTLP tracer-provider bootstrap, shared by the Next server (`instrumentation.ts`)
 * and the standalone `tsx` workers (which never run it). `startTracing` registers
 * a global `NodeTracerProvider` only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set,
 * and is idempotent. Sentry, when enabled, owns the provider instead.
 */
let provider: NodeTracerProvider | null = null

export function startTracing(serviceSuffix?: string): void {
  if (provider) return
  const config = getOtelConfig()
  if (!config) return

  const url = `${config.endpoint.replace(/\/+$/, '')}/v1/traces`
  const serviceName = serviceSuffix
    ? `${config.serviceName}-${serviceSuffix}`
    : config.serviceName

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({ url, headers: config.headers })
      ),
    ],
  })
  provider.register()
  logger.info({ endpoint: url, serviceName }, '[otel] tracing enabled')
}

/** Flush and shut down the provider so the last span batch is exported. */
export async function shutdownTracing(): Promise<void> {
  const current = provider
  provider = null
  if (current) await current.shutdown()
}
