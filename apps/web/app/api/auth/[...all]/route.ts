import { auth } from '@workspace/auth'
import { toNextJsHandler } from 'better-auth/next-js'

// The single API route the app needs — the BetterAuth catch-all handler.
export const { GET, POST } = toNextJsHandler(auth)
