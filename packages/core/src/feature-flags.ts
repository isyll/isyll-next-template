/**
 * Framework-agnostic feature-flag evaluation engine.
 *
 * This module is pure (no IO, no globals): given a {@link FlagDefinition} and an
 * {@link EvaluationContext} it returns a {@link FlagEvaluation}. It deliberately
 * mirrors the OpenFeature evaluation model — named variants, ordered targeting
 * rules, percentage rollouts and standard {@link EvaluationReason} codes — so the
 * storage/transport layer (DB, Redis, an external SaaS) stays swappable behind a
 * provider while the decision logic lives here, in one tested place.
 *
 * The engine never throws and never knows the caller's fallback value: on a
 * misconfiguration it returns `value: undefined` with `reason: 'ERROR'`, and the
 * typed client substitutes its own default. Persisted parts (variants, rules)
 * are described by Zod schemas so the DB layer can validate `jsonb` columns into
 * these exact shapes.
 */
import * as z from 'zod'

// Values & context

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[]

/** The four value kinds a flag can carry (mirrors OpenFeature). */
export type FlagValueType = 'boolean' | 'string' | 'number' | 'json'

/** A resolved flag value. Booleans/strings/numbers are JSON subsets. */
export type FlagValue = JsonValue

/** A value an evaluation context can hold for a targeting attribute. */
export type ContextAttribute =
  | string
  | number
  | boolean
  | readonly string[]
  | null

/**
 * The inputs a flag is evaluated against. `targetingKey` is the stable identity
 * used for sticky percentage bucketing (typically the user id); `attributes`
 * are matched by targeting rules (plan, role, country, …).
 */
export interface EvaluationContext {
  readonly targetingKey?: string
  readonly attributes?: Readonly<Record<string, ContextAttribute>>
}

// Resolution

/** Standard OpenFeature resolution reasons. */
export type EvaluationReason =
  | 'STATIC'
  | 'DEFAULT'
  | 'TARGETING_MATCH'
  | 'SPLIT'
  | 'DISABLED'
  | 'ERROR'

/** Standard OpenFeature error codes (subset). */
export type FlagErrorCode =
  | 'FLAG_NOT_FOUND'
  | 'TYPE_MISMATCH'
  | 'PARSE_ERROR'
  | 'GENERAL'

/** OpenFeature-style resolution details with a guaranteed `value`. */
export interface ResolutionDetails<T extends FlagValue = FlagValue> {
  readonly value: T
  readonly reason: EvaluationReason
  readonly variant?: string
  readonly ruleIndex?: number
  readonly errorCode?: FlagErrorCode
  readonly errorMessage?: string
}

/**
 * The engine's raw verdict. `value` is `undefined` only when the definition is
 * malformed (`reason: 'ERROR'`); the caller then applies its own default.
 */
export interface FlagEvaluation {
  readonly value?: FlagValue
  readonly reason: EvaluationReason
  readonly variant?: string
  readonly ruleIndex?: number
  readonly errorCode?: FlagErrorCode
  readonly errorMessage?: string
}

// Targeting schema (single source of truth for persisted shapes)

/** Comparison operators a targeting condition can use. */
export const CONDITION_OPERATORS = [
  'in',
  'notIn',
  'equals',
  'notEquals',
  'contains',
  'startsWith',
  'endsWith',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
  'exists',
  'notExists',
] as const

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number]

const conditionValueSchema = z.union([z.string(), z.number(), z.boolean()])

export const targetingConditionSchema = z.object({
  /** Context attribute to inspect (e.g. `plan`, `role`; `targetingKey` is special). */
  attribute: z.string().min(1),
  operator: z.enum(CONDITION_OPERATORS),
  /** Operands. Ignored by `exists`/`notExists`; first element used by scalar ops. */
  values: z.array(conditionValueSchema).default([]),
})

export type TargetingCondition = z.infer<typeof targetingConditionSchema>

export const ruleOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('variant'), variant: z.string().min(1) }),
  z.object({
    kind: z.literal('rollout'),
    /** Attribute to bucket by; defaults to `targetingKey`. */
    bucketBy: z.string().min(1).optional(),
    /** variant → relative weight (need not sum to 100; proportions are used). */
    weights: z.record(z.string(), z.number().min(0)),
  }),
])

export type RuleOutcome = z.infer<typeof ruleOutcomeSchema>

export const targetingRuleSchema = z.object({
  description: z.string().optional(),
  /** ANDed together; an empty list matches everyone (a global rule). */
  conditions: z.array(targetingConditionSchema).default([]),
  outcome: ruleOutcomeSchema,
})

export type TargetingRule = z.infer<typeof targetingRuleSchema>

export const flagValueTypeSchema = z.enum([
  'boolean',
  'string',
  'number',
  'json',
])

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
)

export const flagDefinitionSchema = z.object({
  key: z.string().min(1),
  type: flagValueTypeSchema,
  /** Kill switch: when `false` the flag always serves `offVariant`. */
  enabled: z.boolean(),
  /** Named variants → values. Every referenced variant must exist here. */
  variants: z.record(z.string(), jsonValueSchema),
  /** Served when enabled and no rule matches. */
  defaultVariant: z.string().min(1),
  /** Served when disabled (the kill-switch value). */
  offVariant: z.string().min(1),
  /** Evaluated in order; the first matching rule wins. */
  rules: z.array(targetingRuleSchema),
})

export type FlagDefinition = z.infer<typeof flagDefinitionSchema>

// Hashing & bucketing

/**
 * Deterministic 32-bit FNV-1a hash of `seed`, normalized to `[0, 100)`. Stable
 * across processes and runs, so percentage rollouts are sticky: the same
 * `(flag, subject)` pair always lands in the same bucket.
 */
export function bucketFor(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return ((hash >>> 0) / 0x1_0000_0000) * 100
}

// Value coercion

/** Whether a resolved value matches the requested flag type. */
export function isFlagValueOfType(
  value: unknown,
  type: FlagValueType
): boolean {
  switch (type) {
    case 'boolean':
      return typeof value === 'boolean'
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'json':
      return value !== undefined
  }
}

// Condition matching

function isPresent(
  value: ContextAttribute | undefined
): value is ContextAttribute {
  return value !== undefined && value !== null
}

function toComparableString(value: ContextAttribute): string {
  return Array.isArray(value) ? value.join(',') : String(value)
}

function toNumber(value: ContextAttribute): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined
  if (typeof value === 'boolean' || Array.isArray(value)) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Scalar equality that tolerates string/number representation drift. */
function sameScalar(
  actual: ContextAttribute,
  expected: string | number | boolean
): boolean {
  if (actual === expected) return true
  if (Array.isArray(actual))
    return actual.some((item) => item === String(expected))
  return String(actual) === String(expected)
}

function matchesIn(
  actual: ContextAttribute,
  values: readonly (string | number | boolean)[]
): boolean {
  return values.some((value) => sameScalar(actual, value))
}

function compareNumeric(
  actual: ContextAttribute,
  values: readonly (string | number | boolean)[],
  compare: (a: number, b: number) => boolean
): boolean {
  const left = toNumber(actual)
  const right = values[0] === undefined ? undefined : toNumber(values[0])
  if (left === undefined || right === undefined) return false
  return compare(left, right)
}

function contextValue(
  context: EvaluationContext,
  attribute: string
): ContextAttribute | undefined {
  if (attribute === 'targetingKey') return context.targetingKey
  return context.attributes?.[attribute]
}

/** Evaluate a single targeting condition against the context. */
export function matchesCondition(
  condition: TargetingCondition,
  context: EvaluationContext
): boolean {
  const actual = contextValue(context, condition.attribute)
  const { operator, values } = condition

  switch (operator) {
    case 'exists':
      return isPresent(actual)
    case 'notExists':
      return !isPresent(actual)
    case 'in':
      return isPresent(actual) && matchesIn(actual, values)
    case 'notIn':
      return !isPresent(actual) || !matchesIn(actual, values)
    case 'equals':
      return (
        isPresent(actual) &&
        values[0] !== undefined &&
        sameScalar(actual, values[0])
      )
    case 'notEquals':
      return (
        !isPresent(actual) ||
        values[0] === undefined ||
        !sameScalar(actual, values[0])
      )
    case 'contains':
      return (
        isPresent(actual) &&
        values.some((v) => toComparableString(actual).includes(String(v)))
      )
    case 'startsWith':
      return (
        isPresent(actual) &&
        values.some((v) => toComparableString(actual).startsWith(String(v)))
      )
    case 'endsWith':
      return (
        isPresent(actual) &&
        values.some((v) => toComparableString(actual).endsWith(String(v)))
      )
    case 'greaterThan':
      return (
        isPresent(actual) && compareNumeric(actual, values, (a, b) => a > b)
      )
    case 'greaterThanOrEqual':
      return (
        isPresent(actual) && compareNumeric(actual, values, (a, b) => a >= b)
      )
    case 'lessThan':
      return (
        isPresent(actual) && compareNumeric(actual, values, (a, b) => a < b)
      )
    case 'lessThanOrEqual':
      return (
        isPresent(actual) && compareNumeric(actual, values, (a, b) => a <= b)
      )
  }
}

function matchesAllConditions(
  conditions: readonly TargetingCondition[],
  context: EvaluationContext
): boolean {
  return conditions.every((condition) => matchesCondition(condition, context))
}

function bucketSubject(
  context: EvaluationContext,
  bucketBy: string | undefined
): string {
  const value = bucketBy
    ? contextValue(context, bucketBy)
    : context.targetingKey
  if (value === undefined || value === null) return ''
  return toComparableString(value)
}

/**
 * Pick a variant for a percentage rollout. Weights are treated as proportions
 * (they need not sum to 100). Returns `undefined` only when every weight is 0.
 */
function selectRolloutVariant(
  definition: FlagDefinition,
  outcome: Extract<RuleOutcome, { kind: 'rollout' }>,
  context: EvaluationContext
): string | undefined {
  const entries = Object.entries(outcome.weights)
    .filter(([, weight]) => weight > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0) return undefined

  const seed = `${definition.key}:${bucketSubject(context, outcome.bucketBy)}`
  const point = (bucketFor(seed) / 100) * total
  let cumulative = 0
  for (const [variant, weight] of entries) {
    cumulative += weight
    if (point < cumulative) return variant
  }
  // Floating-point safety: the last positive-weight variant covers the tail.
  return entries.at(-1)?.[0]
}

// Engine

/**
 * Resolve a flag for a context. Pure and total — it never throws. On a malformed
 * definition (missing variant, all-zero rollout) it returns `value: undefined`
 * with `reason: 'ERROR'`; the caller substitutes its default.
 */
export function evaluateFlag(
  definition: FlagDefinition,
  context: EvaluationContext = {}
): FlagEvaluation {
  const fromVariant = (
    variant: string,
    reason: EvaluationReason,
    ruleIndex?: number
  ): FlagEvaluation => {
    // Variant values are never `undefined` (JSON allows `null`), so an absent
    // key means the definition references a variant it never declared.
    const value = definition.variants[variant]
    if (value === undefined) {
      return {
        reason: 'ERROR',
        errorCode: 'PARSE_ERROR',
        errorMessage: `Flag "${definition.key}" references undefined variant "${variant}"`,
        ...(ruleIndex === undefined ? {} : { ruleIndex }),
      }
    }
    return {
      value,
      reason,
      variant,
      ...(ruleIndex === undefined ? {} : { ruleIndex }),
    }
  }

  if (!definition.enabled) {
    return fromVariant(definition.offVariant, 'DISABLED')
  }

  for (let index = 0; index < definition.rules.length; index++) {
    const rule = definition.rules[index]
    if (!rule || !matchesAllConditions(rule.conditions, context)) continue

    if (rule.outcome.kind === 'variant') {
      return fromVariant(rule.outcome.variant, 'TARGETING_MATCH', index)
    }

    const variant = selectRolloutVariant(definition, rule.outcome, context)
    if (variant === undefined) {
      return {
        reason: 'ERROR',
        errorCode: 'PARSE_ERROR',
        errorMessage: `Flag "${definition.key}" rollout has no positive weights`,
        ruleIndex: index,
      }
    }
    return fromVariant(variant, 'SPLIT', index)
  }

  return fromVariant(definition.defaultVariant, 'DEFAULT')
}
