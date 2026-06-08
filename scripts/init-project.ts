/**
 * Bootstraps this template for a new project, step by step:
 *   1. Project identity (package name, display name, description)
 *   2. Repository (GitHub owner / repo)
 *   3. URLs & auth (public URL, session cookie prefix, generated secrets)
 *   4. Database (local Docker defaults or a custom connection string)
 *   5. Optional bootstrap (start Postgres, migrate, seed, create an operator)
 *
 * It is idempotent: re-running detects an already-initialized project and asks
 * before touching anything. Runs interactively (@clack) or fully from flags
 * (`--yes`). `--dry-run` previews every change/command without writing.
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  text,
} from '@clack/prompts'
import { Command } from 'commander'
import pc from 'picocolors'

const ROOT = join(import.meta.dirname, '..')
const TEMPLATE_NAME = 'next-monorepo-template'
const TEMPLATE_OWNER = 'isyll'
const LOCAL_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/app'

const program = new Command()
program
  .name('project:init')
  .description('Initialize this template for a new project')
  .option('--name <kebab>', 'package name (kebab-case)')
  .option('--display-name <name>', 'human-facing application name')
  .option('--description <text>', 'one-line description')
  .option('--owner <handle>', 'GitHub owner/org')
  .option('--repo <name>', 'GitHub repository name')
  .option('--author-email <email>', 'contact email (security.txt, author)')
  .option('--cookie-prefix <prefix>', 'end-user session cookie prefix')
  .option('--app-url <url>', 'public application URL')
  .option('--db-url <url>', 'PostgreSQL connection string')
  .option('-y, --yes', 'accept defaults without prompting', false)
  .option('--force', 'reinitialize even if already set up', false)
  .option(
    '--skip-bootstrap',
    'skip the database/operator bootstrap step',
    false
  )
  .option(
    '--fresh-git',
    'reinitialize git with production + development branches',
    false
  )
  .option('--dry-run', 'preview changes without writing or running anything')
  .parse()

const flags = program.opts<{
  name?: string
  displayName?: string
  description?: string
  owner?: string
  repo?: string
  authorEmail?: string
  cookiePrefix?: string
  appUrl?: string
  dbUrl?: string
  yes?: boolean
  force?: boolean
  skipBootstrap?: boolean
  freshGit?: boolean
  dryRun?: boolean
}>()

const dryRun = flags.dryRun ?? false

function toKebab(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function bail(): never {
  cancel('Initialization cancelled.')
  process.exit(0)
}

async function prompt(message: string, fallback: string): Promise<string> {
  if (flags.yes) return fallback
  const answer = await text({
    message,
    placeholder: fallback,
    defaultValue: fallback,
  })
  if (isCancel(answer)) bail()
  const value = answer.trim()
  return value.length > 0 ? value : fallback
}

async function ask(message: string, initialValue = true): Promise<boolean> {
  if (flags.yes) return false
  const answer = await confirm({ message, initialValue })
  if (isCancel(answer)) bail()
  return answer
}

async function choose<T extends string>(
  message: string,
  options: { value: T; label: string; hint?: string }[],
  initialValue: T
): Promise<T> {
  if (flags.yes) return initialValue
  const answer = await select({ message, options, initialValue })
  if (isCancel(answer)) bail()
  return answer
}

function run(label: string, file: string, args: readonly string[]): boolean {
  if (dryRun) {
    note(`${file} ${args.join(' ')}`, pc.dim(`would run · ${label}`))
    return true
  }
  console.info(pc.cyan(`\n▸ ${label}`))
  const result = spawnSync(file, args, { stdio: 'inherit', cwd: ROOT })
  const ok = !result.error && (result.status ?? 1) === 0
  if (!ok) console.warn(pc.yellow(`  skipped/failed: ${label}`))
  return ok
}

function replaceInFile(
  relPath: string,
  replacements: readonly (readonly [string, string])[]
): void {
  if (dryRun) return
  const path = join(ROOT, relPath)
  if (!existsSync(path)) return
  let content = readFileSync(path, 'utf8')
  for (const [from, to] of replacements) content = content.split(from).join(to)
  writeFileSync(path, content)
}

/** Replace `KEY=...` if present, otherwise append it. */
function upsertEnv(env: string, key: string, value: string): string {
  const line = new RegExp(`^${key}=.*$`, 'm')
  if (line.test(env)) return env.replace(line, () => `${key}=${value}`)
  const prefix = env.length === 0 || env.endsWith('\n') ? env : `${env}\n`
  return `${prefix}${key}=${value}\n`
}

/** Keep an existing non-empty secret; otherwise generate a fresh one. */
function ensureSecret(env: string, key: string): string {
  const current = new RegExp(`^${key}=(.*)$`, 'm').exec(env)?.[1]?.trim()
  if (current && current.length > 0) return env
  return upsertEnv(env, key, randomBytes(32).toString('base64'))
}

// --- 0. Detect an already-initialized project ------------------------------
intro(pc.cyan(`${TEMPLATE_NAME} · project setup`))

const rootPkg = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8')
) as { name?: string }
const alreadyInitialized = rootPkg.name !== TEMPLATE_NAME

if (alreadyInitialized && !flags.force && !flags.yes) {
  const proceed = await ask(
    `This project looks initialized (${pc.bold(rootPkg.name ?? '?')}). Re-run setup anyway?`,
    false
  )
  if (!proceed) bail()
}

// --- 1. Project identity ----------------------------------------------------
note('Names and description for your project.', 'Step 1 · Identity')
const name = toKebab(
  flags.name ?? (await prompt('Package name (kebab-case)', 'my-app'))
)
const displayName = flags.displayName ?? (await prompt('Display name', name))
const description =
  flags.description ??
  (await prompt('One-line description', 'A modern web application.'))
const authorEmail =
  flags.authorEmail ?? (await prompt('Contact email', 'contact@example.com'))

// --- 2. Repository ----------------------------------------------------------
note('GitHub owner and repository.', 'Step 2 · Repository')
const owner = flags.owner ?? (await prompt('GitHub owner/org', TEMPLATE_OWNER))
const repo = toKebab(
  flags.repo ?? (await prompt('GitHub repository name', name))
)

// --- 3. URLs & auth ---------------------------------------------------------
note('Public URL and end-user session cookie prefix.', 'Step 3 · URLs & auth')
const appUrl =
  flags.appUrl ?? (await prompt('Public app URL', 'http://localhost:3000'))
const cookiePrefix = toKebab(
  flags.cookiePrefix ??
    (await prompt('Session cookie prefix', name.split('-')[0] ?? name))
)

// --- 4. Database ------------------------------------------------------------
note('How this project connects to PostgreSQL.', 'Step 4 · Database')
type DbMode = 'local' | 'custom' | 'keep'
const dbMode: DbMode = flags.dbUrl
  ? 'custom'
  : await choose<DbMode>(
      'Database connection',
      [
        {
          value: 'local',
          label: 'Local Docker Postgres',
          hint: 'localhost:5432',
        },
        { value: 'custom', label: 'Custom connection string' },
        { value: 'keep', label: 'Leave .env as-is' },
      ],
      'local'
    )

let databaseUrl = LOCAL_DATABASE_URL
if (dbMode === 'custom') {
  databaseUrl =
    flags.dbUrl ?? (await prompt('DATABASE_URL', LOCAL_DATABASE_URL))
}

// --- Apply identity changes -------------------------------------------------
replaceInFile('package.json', [
  [`"name": "${TEMPLATE_NAME}"`, `"name": "${name}"`],
])
replaceInFile('apps/web/messages/fr.json', [
  ['"appName": "App"', `"appName": "${displayName}"`],
  ['"title": "App"', `"title": "${displayName}"`],
  [
    '"description": "Un modèle Next.js 16 ultra-puissant, orienté serveur."',
    `"description": "${description}"`,
  ],
])
// End-user auth identity only — the admin (operator) instance keeps its own.
replaceInFile('packages/auth/src/auth.ts', [
  ["const APP_NAME = 'App'", `const APP_NAME = '${displayName}'`],
  ["cookiePrefix: 'app'", `cookiePrefix: '${cookiePrefix}'`],
])
replaceInFile('apps/web/proxy.ts', [
  ["{ cookiePrefix: 'app' }", `{ cookiePrefix: '${cookiePrefix}' }`],
])
// SEO / site metadata — the single source of truth for titles, OG, manifest.
replaceInFile('apps/web/lib/site-config.ts', [
  ["name: 'App',\n  tagline:", `name: '${displayName}',\n  tagline:`],
  ["name: 'App',\n    email:", `name: '${displayName}',\n    email:`],
  ["email: 'contact@example.com'", `email: '${authorEmail}'`],
  [
    "'Monorepo Next.js 16, React 19, TypeScript strict, BetterAuth, Drizzle et i18n — prêt pour la production.'",
    `'${description}'`,
  ],
])
// AI-agent guide brand line (keep the engineering conventions, swap the name).
replaceInFile('.github/copilot-instructions.md', [
  [`**${TEMPLATE_NAME}**`, `**${displayName}**`],
])
if (owner !== TEMPLATE_OWNER) {
  replaceInFile('.github/CODEOWNERS', [[`@${TEMPLATE_OWNER}`, `@${owner}`]])
}
replaceInFile('.github/ISSUE_TEMPLATE/config.yml', [
  [
    `github.com/${TEMPLATE_OWNER}/${TEMPLATE_NAME}`,
    `github.com/${owner}/${repo}`,
  ],
])
if (!dryRun) {
  const readmePath = join(ROOT, 'README.md')
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, 'utf8')
    writeFileSync(readmePath, readme.replace(/^#\s.*$/m, `# ${displayName}`))
  }
}

// --- Write .env -------------------------------------------------------------
if (!dryRun) {
  const envExample = join(ROOT, '.env.example')
  const envPath = join(ROOT, '.env')
  if (!existsSync(envPath) && existsSync(envExample))
    copyFileSync(envExample, envPath)
  let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
  env = ensureSecret(env, 'AUTH_USER_SECRET')
  env = ensureSecret(env, 'AUTH_ADMIN_SECRET')
  env = upsertEnv(env, 'NEXT_PUBLIC_APP_URL', appUrl)
  env = upsertEnv(env, 'AUTH_USER_URL', appUrl)
  env = upsertEnv(env, 'AUTH_ADMIN_URL', appUrl)
  if (dbMode !== 'keep') {
    env = upsertEnv(env, 'DATABASE_URL', databaseUrl)
    env = upsertEnv(env, 'ADMIN_DATABASE_URL', databaseUrl)
    env = upsertEnv(env, 'MIGRATION_DATABASE_URL', databaseUrl)
  }
  writeFileSync(envPath, env)
}

// --- Write PROJECT.md -------------------------------------------------------
const projectBrief = `# ${displayName}

> ${description}

## Overview

<!-- Describe what this project is, who it is for, and its goals. -->

## Domain model

<!-- Key entities and relationships (the source of truth is @workspace/db). -->

## Constraints & decisions

<!-- Notable product/technical constraints future agents should know. -->

---

Built on ${TEMPLATE_NAME}. See \`AGENTS.md\` for engineering conventions.
`
if (!dryRun) writeFileSync(join(ROOT, 'PROJECT.md'), projectBrief)

// --- 5. Optional bootstrap --------------------------------------------------
const canBootstrap = !flags.yes && !flags.skipBootstrap && dbMode !== 'keep'
if (canBootstrap) {
  note('Get the database up and running.', 'Step 5 · Bootstrap')

  if (
    dbMode === 'local' &&
    (await ask('Start local Postgres and apply migrations (Docker)?'))
  ) {
    if (
      run('Start Postgres', 'docker', [
        'compose',
        '-f',
        'compose.dev.yaml',
        'up',
        '-d',
        '--wait',
        'db',
      ])
    ) {
      run('Apply migrations', 'docker', [
        'compose',
        '-f',
        'compose.dev.yaml',
        'run',
        '--rm',
        'migrator',
      ])
    }
  } else if (
    dbMode === 'custom' &&
    (await ask('Apply migrations now (pnpm db:migrate)?'))
  ) {
    run('Apply migrations', 'pnpm', ['db:migrate'])
  }

  if (await ask('Seed the database (pnpm db:seed)?')) {
    run('Seed database', 'pnpm', ['db:seed'])
  }

  if (await ask('Create a first super operator now?')) {
    const opEmail = await prompt('Operator email', 'admin@example.com')
    const opName = await prompt('Operator name', 'Administrator')
    run('Create operator', 'pnpm', [
      'admin:create-operator',
      '--email',
      opEmail,
      '--name',
      opName,
      '--super',
    ])
  }
}

// --- 6. Fresh git history ---------------------------------------------------
// Drop the template's history and start the project on its own two long-lived
// branches: `production` (default/deploy) and `development` (integration).
const wantsFreshGit = flags.freshGit
  ? true
  : await ask('Start a fresh git history?')
if (wantsFreshGit && !dryRun) {
  note('Reinitializing git (production + development).', 'Step 6 · Git')
  rmSync(join(ROOT, '.git'), { recursive: true, force: true })
  if (run('Initialize git', 'git', ['init', '-b', 'production'])) {
    run('Stage files', 'git', ['add', '-A'])
    run('Initial commit', 'git', [
      'commit',
      '--no-verify',
      '-m',
      `chore: initialize ${name} from ${TEMPLATE_NAME}`,
    ])
    run('Create development branch', 'git', ['branch', 'development'])
  }
} else if (dryRun) {
  note('git init -b production && git branch development', 'Step 6 · Git')
}

// --- Done -------------------------------------------------------------------
const nextSteps = [
  pc.bold(`Initialized ${displayName} (${name}) for ${owner}/${repo}.`),
  '',
  '  • Review generated secrets and URLs in .env',
  flags.yes || flags.skipBootstrap || dbMode === 'keep'
    ? '  • pnpm db:migrate && pnpm db:seed'
    : '  • Database bootstrap handled above (re-run steps as needed)',
  '  • pnpm admin:create-operator --email you@example.com --name "You" --super',
  '  • Rebrand: edit --brand-* in packages/ui/src/styles/globals.css +',
  '    siteConfig.themeColor (see docs/theming.md); replace public/og-image.png',
  '  • pnpm dev',
].join('\n')

outro(
  dryRun
    ? pc.yellow('Dry run complete — no changes written.')
    : pc.green(nextSteps)
)
