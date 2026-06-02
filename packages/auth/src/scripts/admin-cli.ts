import { randomBytes, randomUUID } from 'node:crypto'
import process from 'node:process'

import {
  adminDb,
  operator,
  operatorAccount,
  operatorRole,
  permission,
  role,
  rolePermission,
} from '@workspace/db/admin'
import { Command } from 'commander'
import { config } from 'dotenv'
import { sql } from 'drizzle-orm'
import pc from 'picocolors'

import { adminAuth } from '../admin-auth'
import { ADMIN_PERMISSIONS } from '../permissions'

config({ path: ['../../.env', '.env'], quiet: true })

const SUPER_ROLE_NAME = 'Super Administrator'

async function syncPermissions(): Promise<void> {
  await adminDb
    .insert(permission)
    .values(ADMIN_PERMISSIONS.map((entry) => ({ ...entry })))
    .onConflictDoUpdate({
      target: permission.key,
      set: { description: sql`excluded.description` },
    })
  console.info(pc.green(`✓ Synced ${ADMIN_PERMISSIONS.length} permissions`))
}

interface CreateOperatorOptions {
  email: string
  name: string
  password?: string
  super?: boolean
}

async function createOperator(options: CreateOperatorOptions): Promise<void> {
  const password = options.password ?? randomBytes(18).toString('base64url')
  if (password.length < 16) {
    throw new Error('Operator password must be at least 16 characters')
  }

  const ctx = await adminAuth.$context
  const hashedPassword = await ctx.password.hash(password)
  const operatorId = randomUUID()

  await adminDb.insert(operator).values({
    id: operatorId,
    email: options.email,
    name: options.name,
    emailVerified: true,
    isActive: true,
  })
  await adminDb.insert(operatorAccount).values({
    id: randomUUID(),
    accountId: operatorId,
    providerId: 'credential',
    userId: operatorId,
    password: hashedPassword,
  })

  if (options.super) {
    await syncPermissions()
    const [superRole] = await adminDb
      .insert(role)
      .values({
        name: SUPER_ROLE_NAME,
        description: 'Full access to every console feature',
        isSystem: true,
      })
      .onConflictDoUpdate({ target: role.name, set: { isSystem: true } })
      .returning()
    if (!superRole) throw new Error('Failed to create the super role')

    const permissions = await adminDb
      .select({ id: permission.id })
      .from(permission)
    if (permissions.length > 0) {
      await adminDb
        .insert(rolePermission)
        .values(
          permissions.map((p) => ({ roleId: superRole.id, permissionId: p.id }))
        )
        .onConflictDoNothing()
    }
    await adminDb
      .insert(operatorRole)
      .values({ operatorId, roleId: superRole.id })
      .onConflictDoNothing()
  }

  console.info(pc.green(`✓ Created operator ${options.email}`))
  if (!options.password) {
    console.info(pc.yellow(`  Generated password: ${password}`))
  }
}

const program = new Command()
program.name('admin').description('Admin console maintenance commands')

program
  .command('sync-permissions')
  .description('Upsert the hardcoded permission catalogue into the database')
  .action(syncPermissions)

program
  .command('create-operator')
  .description('Provision an internal operator (admin) account')
  .requiredOption('--email <email>', 'operator email address')
  .requiredOption('--name <name>', 'operator full name')
  .option(
    '--password <password>',
    'password (>= 16 chars); generated if omitted'
  )
  .option(
    '--super',
    'also grant a Super Administrator role with all permissions'
  )
  .action((options: CreateOperatorOptions) => createOperator(options))

await program.parseAsync(process.argv)
process.exit(0)
