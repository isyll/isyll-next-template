import { boolean, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'

import { timestamps } from './_helpers'
import { user } from './auth'

/** Example domain table, owned by a BetterAuth `user`. */
export const post = pgTable(
  'post',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    published: boolean('published').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('post_author_id_idx').on(table.authorId)]
)
