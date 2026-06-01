'use server'

import { adminAuth } from '@workspace/auth/admin'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signOutAdminAction(): Promise<void> {
  await adminAuth.api.signOut({ headers: await headers() })
  redirect('/admin/login')
}
