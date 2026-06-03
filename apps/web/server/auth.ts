'use server'

import { userAuth } from '@workspace/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signOutAction(): Promise<void> {
  await userAuth.api.signOut({ headers: await headers() })
  redirect('/login')
}
