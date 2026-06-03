import { adminAuth } from '@workspace/auth/admin'
import { toNextJsHandler } from 'better-auth/next-js'

// Catch-all handler for the isolated admin BetterAuth instance (base path
// /admin/api/auth). The whole /admin surface is blocked at the reverse proxy
// in production.
export const { GET, POST } = toNextJsHandler(adminAuth)
