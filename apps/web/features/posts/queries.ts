import 'server-only'

import { db, type PostRow, schema } from '@workspace/db'
import { InternalError } from '@workspace/core'
import { and, desc, eq } from 'drizzle-orm'

/**
 * Data Access Layer for posts. Server-only; the place where DB access and
 * ownership checks live. Server actions delegate here.
 */
export async function listPostsByAuthor(authorId: string): Promise<PostRow[]> {
  return db
    .select()
    .from(schema.post)
    .where(eq(schema.post.authorId, authorId))
    .orderBy(desc(schema.post.createdAt))
}

export async function createPost(input: {
  authorId: string
  title: string
  content: string | null
}): Promise<PostRow> {
  const [created] = await db.insert(schema.post).values(input).returning()
  if (!created) {
    throw new InternalError('Failed to create post')
  }
  return created
}

export async function deletePostForAuthor(
  id: string,
  authorId: string
): Promise<void> {
  await db
    .delete(schema.post)
    .where(and(eq(schema.post.id, id), eq(schema.post.authorId, authorId)))
}
