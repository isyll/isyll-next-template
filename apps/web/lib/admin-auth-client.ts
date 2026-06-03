import { createAuthClient } from 'better-auth/react'

import { env } from '@/env'

/** Browser client for the admin auth instance (separate base path). */
export const adminAuthClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  basePath: '/admin/api/auth',
})
