import { randomBytes, randomUUID } from 'node:crypto'
import process from 'node:process'

import {
  adminDb,
  operatorAccounts,
  operatorRoles,
  operators,
  permissions,
  rolePermissions,
  roles,
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
    .insert(permissions)
    .values(ADMIN_PERMISSIONS.map((entry) => ({ ...entry })))
    .onConflictDoUpdate({
      target: permissions.key,
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

  await adminDb.insert(operators).values({
    id: operatorId,
    email: options.email,
    name: options.name,
    emailVerified: true,
    isActive: true,
  })
  await adminDb.insert(operatorAccounts).values({
    id: randomUUID(),
    accountId: operatorId,
    providerId: 'credential',
    userId: operatorId,
    password: hashedPassword,
  })

  if (options.super) {
    await syncPermissions()
    const [superRole] = await adminDb
      .insert(roles)
      .values({
        name: SUPER_ROLE_NAME,
        description: 'Full access to every console feature',
        isSystem: true,
      })
      .onConflictDoUpdate({ target: roles.name, set: { isSystem: true } })
      .returning()
    if (!superRole) throw new Error('Failed to create the super role')

    const allPermissions = await adminDb
      .select({ id: permissions.id })
      .from(permissions)
    if (allPermissions.length > 0) {
      await adminDb
        .insert(rolePermissions)
        .values(
          allPermissions.map((p) => ({
            roleId: superRole.id,
            permissionId: p.id,
          }))
        )
        .onConflictDoNothing()
    }
    await adminDb
      .insert(operatorRoles)
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
