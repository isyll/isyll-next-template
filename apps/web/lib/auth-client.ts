import { createAuthClient } from 'better-auth/react'

import { env } from '@/env'

/** Browser auth client. Safe to import from Client Components. */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
