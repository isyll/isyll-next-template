import type { Actor } from '@workspace/db'

import {
  catalogDefinition,
  FLAG_KEYS,
  type FlagKey,
} from '@/lib/feature-flags/catalog'
import {
  readAllFlags,
  readFlag,
  removeFlag,
  setFlagEnabled,
  writeFlag,
} from '@/lib/feature-flags/store'

/**
 * Feature-flag maintenance CLI (zero-config — reads ambient env like the
 * workers). Lets ops flip a flag or materialize the catalogue without a deploy:
 *
 *   pnpm --filter web flags list
 *   pnpm --filter web flags sync            # create rows for catalogue flags
 *   pnpm --filter web flags enable ui.newDashboard
 *   pnpm --filter web flags disable ui.newDashboard
 *   pnpm --filter web flags remove ui.newDashboard
 *
 * Each write emits a `feature_flag.changed` event and invalidates the cache.
 */
const CLI_ACTOR: Actor = { id: 'cli', type: 'system' }

function isFlagKey(value: string): value is FlagKey {
  return (FLAG_KEYS as readonly string[]).includes(value)
}

async function list(): Promise<void> {
  const flags = await readAllFlags()
  if (flags.length === 0) {
    console.info(
      'No flags configured. Run `flags sync` to materialize the catalogue.'
    )
    return
  }
  for (const flag of flags) {
    const mark = flag.enabled ? '●' : '○'
    console.info(
      `${mark} ${flag.key}  [${flag.type}]  default=${flag.defaultVariant}  rules=${String(flag.rules.length)}`
    )
  }
}

async function sync(only?: string): Promise<void> {
  if (only !== undefined && !isFlagKey(only)) {
    console.error(`Unknown flag key: ${only}`)
    process.exitCode = 1
    return
  }
  const keys = only ? [only] : FLAG_KEYS
  let created = 0
  let skipped = 0
  for (const key of keys) {
    if (await readFlag(key)) {
      skipped++
      continue
    }
    const definition = catalogDefinition(key)
    await writeFlag(definition, CLI_ACTOR)
    created++
    console.info(`created ${key}`)
  }
  console.info(
    `Sync complete — ${String(created)} created, ${String(skipped)} already present.`
  )
}

async function setEnabled(key: string, enabled: boolean): Promise<void> {
  const ok = await setFlagEnabled(key, enabled, CLI_ACTOR)
  if (!ok) {
    console.error(`Flag "${key}" is not configured. Run \`flags sync\` first.`)
    process.exitCode = 1
    return
  }
  console.info(`${key} ${enabled ? 'enabled' : 'disabled'}`)
}

async function remove(key: string): Promise<void> {
  const ok = await removeFlag(key, CLI_ACTOR)
  console.info(ok ? `removed ${key}` : `Flag "${key}" was not configured.`)
}

function usage(): void {
  console.info(
    [
      'Usage: pnpm --filter web flags <command>',
      '',
      '  list                 List configured flags',
      '  sync [key]           Create DB rows for catalogue flags (missing only)',
      '  enable <key>         Turn a flag on',
      '  disable <key>        Turn a flag off',
      '  remove <key>         Delete a flag configuration',
    ].join('\n')
  )
}

async function main(): Promise<void> {
  const [command, arg] = process.argv.slice(2)
  switch (command) {
    case 'list':
      await list()
      break
    case 'sync':
      await sync(arg)
      break
    case 'enable':
      if (!arg) {
        usage()
        break
      }
      await setEnabled(arg, true)
      break
    case 'disable':
      if (!arg) {
        usage()
        break
      }
      await setEnabled(arg, false)
      break
    case 'remove':
      if (!arg) {
        usage()
        break
      }
      await remove(arg)
      break
    default:
      usage()
      break
  }
}

await main()
process.exit(process.exitCode ?? 0)
