/**
 * Bootstraps this template for a new project: renames the root package, updates
 * the app metadata / French messages / BetterAuth identity, the README title,
 * creates `.env`, and writes the `PROJECT.md` brief.
 *
 * Usage:
 *   pnpm project:init [--name <kebab>] [--display-name <name>]
 *                     [--description <text>] [--yes]
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { parseArgs } from 'node:util'

const ROOT = join(import.meta.dirname, '..')

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    'display-name': { type: 'string' },
    description: { type: 'string' },
    yes: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
})

if (values.help) {
  console.log(
    'Usage: pnpm project:init [--name <kebab>] [--display-name <name>] [--description <text>] [--yes]'
  )
  process.exit(0)
}

function toKebab(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ask(question: string, fallback: string): Promise<string> {
  if (values.yes) return fallback
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = (await rl.question(`${question} (${fallback}): `)).trim()
    return answer.length > 0 ? answer : fallback
  } finally {
    rl.close()
  }
}

const name = toKebab(
  values.name ?? (await ask('Project name (kebab-case)', 'my-app'))
)
const displayName = values['display-name'] ?? (await ask('Display name', name))
const description =
  values.description ??
  (await ask('One-line description', 'A modern web application.'))
const cookiePrefix = name.split('-')[0] ?? name

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
  ['"name": "isyll-next-template"', `"name": "${name}"`],
])

replaceInFile('apps/web/messages/fr.json', [
  ['"appName": "Isyll"', `"appName": "${displayName}"`],
  ['"title": "Isyll — Modèle Next.js"', `"title": "${displayName}"`],
  [
    '"description": "Un modèle Next.js 16 ultra-puissant, orienté serveur."',
    `"description": "${description}"`,
  ],
])

replaceInFile('packages/auth/src/auth.ts', [
  ["appName: 'isyll-next-template'", `appName: '${name}'`],
  ["cookiePrefix: 'isyll'", `cookiePrefix: '${cookiePrefix}'`],
])

replaceInFile('apps/web/src/proxy.ts', [
  ["{ cookiePrefix: 'isyll' }", `{ cookiePrefix: '${cookiePrefix}' }`],
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

Built on the isyll-next-template. See \`AGENTS.md\` for engineering conventions.
`
writeFileSync(join(ROOT, 'PROJECT.md'), projectBrief)

console.log(`\n✅ Initialized "${displayName}" (${name}).`)
console.log('Next steps:')
console.log('  1. Set secrets in .env (BETTER_AUTH_SECRET, DATABASE_URL, ...).')
console.log('  2. pnpm db:migrate && pnpm db:seed')
console.log('  3. pnpm dev')
