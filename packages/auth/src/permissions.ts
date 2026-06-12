/**
 * Admin permission catalogue and single source of truth for PBAC. Keys are
 * hardcoded here, synced into `admin.permission` (`pnpm admin:sync-permissions`),
 * granted to roles by operators, and checked by the admin action clients.
 * Roles are dynamic; permissions are not — add a key here, then sync.
 */
export const ADMIN_PERMISSIONS = [
  { key: 'console.access', description: 'Sign in to the admin console' },
  { key: 'users.read', description: 'View end users' },
  {
    key: 'users.write',
    description: 'Edit end users (deactivate, force sign-out)',
  },
  { key: 'operators.read', description: 'View operators' },
  {
    key: 'operators.write',
    description: 'Create, edit and deactivate operators',
  },
  { key: 'roles.read', description: 'View roles and their permissions' },
  { key: 'roles.write', description: 'Create, edit and assign roles' },
  {
    key: 'monitoring.read',
    description: 'View monitoring, issues and incidents',
  },
  {
    key: 'jobs.read',
    description: 'View background jobs and the dead-letter queue',
  },
  {
    key: 'jobs.write',
    description: 'Replay or discard dead-letter events',
  },
  { key: 'supported_countries.read', description: 'View supported countries' },
  {
    key: 'supported_countries.write',
    description: 'Manage supported countries',
  },
] as const

export type AdminPermissionKey = (typeof ADMIN_PERMISSIONS)[number]['key']

export const ADMIN_PERMISSION_KEYS: readonly AdminPermissionKey[] =
  ADMIN_PERMISSIONS.map((entry) => entry.key)
