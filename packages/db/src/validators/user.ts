import { createSelectSchema } from 'drizzle-zod'
import type * as z from 'zod'

import { users } from '../schema/auth'

export const userSelectSchema = createSelectSchema(users)

export type User = z.infer<typeof userSelectSchema>
export type UserRow = typeof users.$inferSelect
