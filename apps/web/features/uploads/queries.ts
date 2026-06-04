import 'server-only'

import { db, notDeleted, schema, softDeletePatch } from '@workspace/db'
import { and, desc, eq } from 'drizzle-orm'

const { uploads } = schema

export interface UploadDTO {
  id: string
  bucket: string
  objectKey: string
  contentType: string
  sizeBytes: number
  originalName: string | null
  createdAt: string
}

export interface RecordUploadInput {
  userId: string
  bucket: string
  objectKey: string
  contentType: string
  sizeBytes: number
  originalName?: string
}

type UploadRow = typeof uploads.$inferSelect

function toDto(row: UploadRow): UploadDTO {
  return {
    id: row.id,
    bucket: row.bucket,
    objectKey: row.objectKey,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    originalName: row.originalName,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Persist metadata for a stored object (call after a successful upload). */
export async function recordUpload(
  input: RecordUploadInput
): Promise<UploadDTO> {
  const [row] = await db
    .insert(uploads)
    .values({
      userId: input.userId,
      bucket: input.bucket,
      objectKey: input.objectKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      originalName: input.originalName ?? null,
    })
    .returning()
  if (!row) throw new Error('Failed to record upload')
  return toDto(row)
}

/** A user's live uploads, newest first. Ownership enforced by `userId`. */
export async function listUploads(userId: string): Promise<UploadDTO[]> {
  const rows = await db
    .select()
    .from(uploads)
    .where(and(eq(uploads.userId, userId), notDeleted(uploads)))
    .orderBy(desc(uploads.createdAt))
  return rows.map(toDto)
}

/** A single upload owned by the user, or null. */
export async function getUpload(
  userId: string,
  id: string
): Promise<UploadDTO | null> {
  const [row] = await db
    .select()
    .from(uploads)
    .where(
      and(eq(uploads.id, id), eq(uploads.userId, userId), notDeleted(uploads))
    )
    .limit(1)
  return row ? toDto(row) : null
}

/** Soft-delete one of the user's uploads (caller also deletes the object). */
export async function softDeleteUpload(
  userId: string,
  id: string
): Promise<void> {
  await db
    .update(uploads)
    .set(softDeletePatch())
    .where(and(eq(uploads.id, id), eq(uploads.userId, userId)))
}
