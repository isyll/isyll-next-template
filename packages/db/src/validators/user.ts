import { createSelectSchema } from 'drizzle-zod'
import type * as z from 'zod'

import { user } from '../schema/auth'

export const userSelectSchema = createSelectSchema(user)

export type User = z.infer<typeof userSelectSchema>
export type UserRow = typeof user.$inferSelect
