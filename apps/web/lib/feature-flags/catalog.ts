import type { FlagDefinition, FlagValueType, JsonValue } from '@workspace/core'

/**
 * Typed flag catalogue — the compile-time source of truth for which flags exist,
 * their value type, and the default served when no DB override is configured.
 *
 * Adding a key here makes it available to the type-safe client immediately and,
 * with no DB row, it resolves to `defaultValue` (degrade-safe). Run
 * `pnpm --filter web flags sync` to materialize a tunable row per key.
 */
export interface FlagSpec<
  Type extends FlagValueType = FlagValueType,
  Value extends JsonValue = JsonValue,
> {
  readonly type: Type
  readonly defaultValue: Value
  readonly description: string
}

const boolean = (defaultValue: boolean, description: string) =>
  ({ type: 'boolean', defaultValue, description }) as const

const string = (defaultValue: string, description: string) =>
  ({ type: 'string', defaultValue, description }) as const

const number = (defaultValue: number, description: string) =>
  ({ type: 'number', defaultValue, description }) as const

const json = <const Value extends JsonValue>(
  defaultValue: Value,
  description: string
) => ({ type: 'json', defaultValue, description }) as const

/**
 * The flag catalogue. Keys follow `{area}.{name}`. Keep this list curated —
 * dead flags are debt.
 */
export const FLAGS = {
  'billing.enabled': boolean(
    false,
    'Gate the Stripe billing UI and subscription features.'
  ),
  'notifications.realtime': boolean(
    true,
    'Stream the notification inbox over Server-Sent Events.'
  ),
  'uploads.maxMegabytes': number(
    10,
    'Maximum direct-upload size, in megabytes.'
  ),
  'search.engine': string(
    'postgres',
    'Search backend to query (e.g. "postgres" or an external engine).'
  ),
  'ui.newDashboard': boolean(
    false,
    'Opt users into the redesigned dashboard (gradual rollout).'
  ),
  'ui.announcement': json<{ message: string; level: string } | null>(
    null,
    'Optional site-wide announcement banner payload, or null when hidden.'
  ),
} as const satisfies Record<string, FlagSpec>

export type FlagCatalog = typeof FLAGS
export type FlagKey = keyof FlagCatalog

export type FlagSpecOf<K extends FlagKey> = FlagCatalog[K]
export type FlagValueOf<K extends FlagKey> = FlagCatalog[K]['defaultValue']

type KeysOfType<T extends FlagValueType> = {
  [K in FlagKey]: FlagCatalog[K]['type'] extends T ? K : never
}[FlagKey]

export type BooleanFlagKey = KeysOfType<'boolean'>
export type StringFlagKey = KeysOfType<'string'>
export type NumberFlagKey = KeysOfType<'number'>
export type JsonFlagKey = KeysOfType<'json'>

export const FLAG_KEYS = Object.keys(FLAGS) as FlagKey[]

/** The spec for a known flag key. */
export function flagSpec<K extends FlagKey>(key: K): FlagSpecOf<K> {
  return FLAGS[key]
}

/**
 * Build the default {@link FlagDefinition} for a catalogue key — an enabled flag
 * with no rules that resolves to the catalogue default. Used by `flags:sync` to
 * materialize a tunable DB row; ops then add variants/rules or flip the switch.
 */
export function catalogDefinition(key: FlagKey): FlagDefinition {
  const spec = FLAGS[key]
  if (spec.type === 'boolean') {
    return {
      key,
      type: 'boolean',
      enabled: true,
      variants: { enabled: true, disabled: false },
      defaultVariant: spec.defaultValue ? 'enabled' : 'disabled',
      offVariant: 'disabled',
      rules: [],
    }
  }
  return {
    key,
    type: spec.type,
    enabled: true,
    variants: { default: spec.defaultValue },
    defaultVariant: 'default',
    offVariant: 'default',
    rules: [],
  }
}
