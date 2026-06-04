/**
 * Bump the project version (root `package.json` only).
 *
 *   pnpm version:bump patch | minor | major
 *   pnpm version:bump v=1.4.0
 *
 * Internal workspace packages are deliberately pinned to 0.0.0 and treated as
 * non-versioned: this command never bumps them and resets any drift back to
 * 0.0.0. The git working tree must be clean; on success the bump is committed
 * (`chore(release): vX.Y.Z`) and tagged. Use `--dry-run` to preview, and
 * `--no-commit` / `--no-tag` to skip the git steps.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { Command } from 'commander'
import pc from 'picocolors'

const ROOT = join(import.meta.dirname, '..')
const INTERNAL_VERSION = '0.0.0'
const WORKSPACE_GLOBS = ['apps', 'packages'] as const
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const RELEASE_KINDS = ['patch', 'minor', 'major'] as const

type ReleaseKind = (typeof RELEASE_KINDS)[number]

function fail(message: string): never {
  console.error(pc.red(`✗ ${message}`))
  process.exit(1)
}

function git(args: readonly string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

function readVersion(path: string): string {
  const match = /"version"\s*:\s*"([^"]*)"/.exec(readFileSync(path, 'utf8'))
  return match?.[1] ?? ''
}

/** Replace the first `"version": "..."` field, preserving all other formatting. */
function writeVersion(path: string, version: string): void {
  const content = readFileSync(path, 'utf8')
  writeFileSync(
    path,
    content.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`)
  )
}

function nextVersion(current: string, kind: ReleaseKind): string {
  const core = current.split('-')[0] ?? current
  const [major = 0, minor = 0, patch = 0] = core.split('.').map(Number)
  if ([major, minor, patch].some(Number.isNaN)) {
    fail(`Root version "${current}" is not valid semver`)
  }
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

/** Resolve the requested target into a concrete semver string. */
function resolveTarget(request: string, current: string): string {
  if (request.startsWith('v=')) {
    const explicit = request.slice(2)
    if (!SEMVER.test(explicit))
      fail(`"${explicit}" is not valid semver (x.y.z)`)
    return explicit
  }
  if ((RELEASE_KINDS as readonly string[]).includes(request)) {
    return nextVersion(current, request as ReleaseKind)
  }
  fail(`Unknown bump "${request}". Use patch | minor | major | v=x.y.z`)
}

/** Every internal workspace `package.json` (apps/* and packages/*). */
function internalManifests(): string[] {
  const manifests: string[] = []
  for (const glob of WORKSPACE_GLOBS) {
    const base = join(ROOT, glob)
    if (!existsSync(base)) continue
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const manifest = join(base, entry.name, 'package.json')
      if (existsSync(manifest)) manifests.push(manifest)
    }
  }
  return manifests
}

const program = new Command()
program
  .name('version:bump')
  .description('Bump the project version in the root package.json')
  .argument('<bump>', 'patch | minor | major | v=x.y.z')
  .option('--dry-run', 'show what would change without writing or committing')
  .option('--no-commit', 'do not create the release commit')
  .option('--no-tag', 'do not create the git tag')
  .parse()

const [bump] = program.args
const flags = program.opts<{
  dryRun?: boolean
  commit: boolean
  tag: boolean
}>()

if (!flags.dryRun && git(['status', '--porcelain']).length > 0) {
  fail('Working tree is not clean — commit or stash your changes first')
}

const rootManifest = join(ROOT, 'package.json')
const current = readVersion(rootManifest)
if (!SEMVER.test(current)) fail(`Root version "${current}" is not valid semver`)

const target = resolveTarget(bump ?? '', current)
if (target === current) fail(`Version is already ${current}`)

console.info(
  `${pc.dim('version')} ${current} ${pc.dim('→')} ${pc.green(pc.bold(target))}`
)

// Internal packages stay non-versioned (pinned to 0.0.0); report any drift.
const drifted = internalManifests().filter(
  (path) => readVersion(path) !== INTERNAL_VERSION
)
for (const path of drifted) {
  console.info(
    pc.yellow(`  pin ${path.replace(`${ROOT}/`, '')} → ${INTERNAL_VERSION}`)
  )
}

if (flags.dryRun) {
  console.info(pc.dim('(dry run — nothing written)'))
  process.exit(0)
}

writeVersion(rootManifest, target)
for (const path of drifted) writeVersion(path, INTERNAL_VERSION)

if (flags.commit) {
  git(['add', '-A'])
  git(['commit', '-m', `chore(release): v${target}`])
  console.info(pc.green(`✓ committed chore(release): v${target}`))
  if (flags.tag) {
    git(['tag', '-a', `v${target}`, '-m', `v${target}`])
    console.info(pc.green(`✓ tagged v${target}`))
  }
}

console.info(pc.green(`✓ bumped to ${target}`))
