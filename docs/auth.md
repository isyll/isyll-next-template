# Authentication & authorization

Two independent BetterAuth instances. They share no tables, schema, role,
secret, cookie, or code path — a valid session on one can never satisfy the
other.

| Aspect     | End users (`@workspace/auth`)         | Operators (`@workspace/auth/admin`)    |
| ---------- | ------------------------------------- | -------------------------------------- |
| Instance   | `userAuth`                            | `adminAuth`                            |
| Schema     | `public` (`user`, `session`, …)       | `admin` (`operator`, …)                |
| Connection | `DATABASE_URL` (role `app`)           | `ADMIN_DATABASE_URL` (`admin_service`) |
| Secret     | `AUTH_USER_SECRET`                    | `AUTH_ADMIN_SECRET`                    |
| Base path  | `/api/auth`                           | `/admin/api/auth`                      |
| Cookie     | prefix `app`, `SameSite=Lax`          | prefix `admin`, `SameSite=Strict`      |
| Sign-up    | Self-service (email/password, social) | Disabled — provisioned only            |
| Session    | Stateful, 30 days, rolling            | Stateful, 12 hours                     |

```mermaid
flowchart TB
    subgraph users["End users — @workspace/auth"]
      U1[/api/auth] --> U2[userAuth] --> U3[(app schema · role app)]
    end
    subgraph ops["Operators — @workspace/auth/admin"]
      A1[/admin/api/auth] --> A2[adminAuth] --> A3[(admin schema · role admin_service)]
    end
    users -. no shared secret / cookie / table .- ops
```

Sessions are classic stateful cookies (the cookie holds an opaque token; the
session is the source of truth, validated on every request — no JWT, no bearer
tokens). Sessions live in Redis (`secondaryStorage`) with a DB fallback;
revoking them (force-logout, deactivation) clears them immediately.

Passwords are hashed with **Argon2id** (memory-hard, OWASP-balanced params) via
`@node-rs/argon2`, replacing BetterAuth's default scrypt — see
`packages/auth/src/password.ts`.

## Operators are provisioned, never self-service

Operators model internal staff (or a future LDAP/AD bridge), so the admin
instance has `disableSignUp: true` and no registration page. Create them with
the CLI:

```bash
pnpm admin:sync-permissions                      # load the permission catalogue
pnpm admin:create-operator --email ops@org.com --name "Ops" --super
```

`--super` creates a "Super Administrator" role holding every permission and
assigns it. Without `--super`, grant roles explicitly.

## PBAC (permission-based access control)

Authorization is `operators → roles → permissions`:

- **Permissions** are hardcoded in `packages/auth/src/permissions.ts` (the single
  source of truth) and synced into `admin.permission`.
- **Roles** are created dynamically by operators with the `roles.write`
  permission and map to permissions via `admin.role_permission`.
- Operators hold roles via `admin.operator_role`.

Enforce a permission in a Server Action:

```ts
import { adminActionWithPermission } from '@/lib/admin-safe-action'

export const deactivateOperator = adminActionWithPermission('operators.write')
  .metadata({ actionName: 'deactivateOperator' })
  .inputSchema(/* ... */)
  .action(async ({ ctx }) => {
    // ctx.operator and ctx.permissions are available
  })
```

`adminActionClient` rejects inactive operators; `adminActionWithPermission`
additionally requires a specific permission key.
