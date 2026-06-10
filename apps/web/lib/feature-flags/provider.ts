import {
  type EvaluationContext,
  evaluateFlag,
  type FlagDefinition,
  type FlagEvaluation,
} from '@workspace/core'

/**
 * The seam that makes the flag backend swappable (the OpenFeature provider role).
 * A provider turns a flag key + context into a raw {@link FlagEvaluation}; the
 * typed client layers defaults and coercion on top. To move off Postgres (e.g.
 * to LaunchDarkly or a config service), implement this interface and swap the
 * provider the client is constructed with — nothing else changes.
 */
export interface FlagProvider {
  /** Stable identifier for diagnostics. */
  readonly name: string
  /** Resolve a flag, returning a `FLAG_NOT_FOUND` error when the key is unknown. */
  resolve(key: string, context: EvaluationContext): Promise<FlagEvaluation>
}

const notFound = (key: string): FlagEvaluation => ({
  reason: 'ERROR',
  errorCode: 'FLAG_NOT_FOUND',
  errorMessage: `No configuration for flag "${key}"`,
})

/**
 * In-memory provider backed by a fixed set of definitions. Useful for tests and
 * for previews/Storybook where a database is not available.
 */
export class StaticFlagProvider implements FlagProvider {
  readonly name = 'static'
  private readonly definitions: Map<string, FlagDefinition>

  constructor(definitions: Iterable<FlagDefinition> = []) {
    this.definitions = new Map(
      [...definitions].map((definition) => [definition.key, definition])
    )
  }

  /** Add or replace a definition (chainable, for ergonomic test setup). */
  set(definition: FlagDefinition): this {
    this.definitions.set(definition.key, definition)
    return this
  }

  resolve(key: string, context: EvaluationContext): Promise<FlagEvaluation> {
    const definition = this.definitions.get(key)
    return Promise.resolve(
      definition ? evaluateFlag(definition, context) : notFound(key)
    )
  }
}

export { notFound as flagNotFound }
