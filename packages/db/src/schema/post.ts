import { boolean, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { timestamps } from './_helpers'

/**
 * Example domain table. `authorId` is wired to the BetterAuth `user` table via
 * a foreign key in the auth schema phase.
 */
export const post = pgTable(
  'post',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: text('author_id').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    published: boolean('published').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('post_author_id_idx').on(table.authorId)]
)
