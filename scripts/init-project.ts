/**
 * Bootstraps this template for a new project: renames the package, rewrites the
 * app/auth identity and GitHub owner references, generates auth secrets into a
 * fresh `.env`, and writes the `PROJECT.md` brief. Runs interactively (@clack)
 * or fully from flags (`--yes`).
 */
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { cancel, confirm, intro, isCancel, outro, text } from '@clack/prompts'
import { Command } from 'commander'
import pc from 'picocolors'

const ROOT = join(import.meta.dirname, '..')
const TEMPLATE_NAME = 'next-monorepo-template'
const TEMPLATE_OWNER = 'isyll'

const program = new Command()
program
  .name('project:init')
  .description('Initialize this template for a new project')
  .option('--name <kebab>', 'package name (kebab-case)')
  .option('--display-name <name>', 'human-facing application name')
  .option('--description <text>', 'one-line description')
  .option('--owner <handle>', 'GitHub owner/org')
  .option('--repo <name>', 'GitHub repository name')
  .option('--cookie-prefix <prefix>', 'end-user session cookie prefix')
  .option('-y, --yes', 'accept defaults without prompting', false)
  .parse()

const flags = program.opts<{
  name?: string
  displayName?: string
  description?: string
  owner?: string
  repo?: string
  cookiePrefix?: string
  yes?: boolean
}>()

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

intro(pc.cyan('next-monorepo-template · project setup'))

const name = toKebab(
  flags.name ?? (await prompt('Package name (kebab-case)', 'my-app'))
)
const displayName = flags.displayName ?? (await prompt('Display name', name))
const description =
  flags.description ??
  (await prompt('One-line description', 'A modern web application.'))
const owner = flags.owner ?? (await prompt('GitHub owner/org', TEMPLATE_OWNER))
const repo = toKebab(
  flags.repo ?? (await prompt('GitHub repository name', name))
)
const cookiePrefix = toKebab(
  flags.cookiePrefix ??
    (await prompt('Session cookie prefix', name.split('-')[0] ?? name))
)

function replaceInFile(
  relPath: string,
  replacements: readonly (readonly [string, string])[]
): void {
  const path = join(ROOT, relPath)
  if (!existsSync(path)) return
  let content = readFileSync(path, 'utf8')
  for (const [from, to] of replacements) {
    content = content.split(from).join(to)
  }
  writeFileSync(path, content)
}

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
  ["appName: 'App'", `appName: '${displayName}'`],
  ["cookiePrefix: 'app'", `cookiePrefix: '${cookiePrefix}'`],
])
replaceInFile('apps/web/proxy.ts', [
  ["{ cookiePrefix: 'app' }", `{ cookiePrefix: '${cookiePrefix}' }`],
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

const readmePath = join(ROOT, 'README.md')
if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, 'utf8')
  writeFileSync(readmePath, readme.replace(/^#\s.*$/m, `# ${displayName}`))
}

const envExample = join(ROOT, '.env.example')
const envPath = join(ROOT, '.env')
if (existsSync(envExample) && !existsSync(envPath)) {
  copyFileSync(envExample, envPath)
  const secret = (): string => randomBytes(32).toString('base64')
  const env = readFileSync(envPath, 'utf8')
    .replace(/^AUTH_USER_SECRET=.*$/m, `AUTH_USER_SECRET=${secret()}`)
    .replace(/^AUTH_ADMIN_SECRET=.*$/m, `AUTH_ADMIN_SECRET=${secret()}`)
  writeFileSync(envPath, env)
}

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
writeFileSync(join(ROOT, 'PROJECT.md'), projectBrief)

if (!flags.yes) {
  const proceed = await confirm({
    message: `Initialize ${pc.bold(displayName)} (${name}) owned by ${owner}/${repo}?`,
  })
  if (isCancel(proceed) || !proceed) bail()
}

outro(
  pc.green(`Initialized ${displayName}.`) +
    '\n  1. Review generated secrets in .env' +
    '\n  2. pnpm db:migrate && pnpm db:seed' +
    '\n  3. pnpm admin:create-operator --email you@example.com --name "You" --super' +
    '\n  4. pnpm dev'
)
