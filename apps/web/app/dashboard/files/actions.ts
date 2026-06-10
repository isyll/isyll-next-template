'use server'

import { ForbiddenError, NotFoundError } from '@workspace/core'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import {
  getUpload,
  recordUpload,
  softDeleteUpload,
} from '@/features/uploads/queries'
import { getNumberFlag } from '@/lib/feature-flags'
import { authActionClient, rateLimitedActionClient } from '@/lib/safe-action'
import {
  deleteObject,
  getBucketName,
  getDownloadUrl,
  getUploadUrl,
  isStorageConfigured,
} from '@/lib/storage'
import {
  buildObjectKey,
  UPLOAD_ALLOWED_CONTENT_TYPES,
  type UploadConstraints,
  validateUpload,
} from '@/lib/upload'

/**
 * File-management actions. Uploads use the presigned direct-to-storage flow:
 * `requestUpload` mints a short-lived PUT URL, the browser uploads the bytes
 * straight to S3, then `confirmUpload` records the metadata. Object keys are
 * namespaced by user id and re-verified on confirm, so a user can only register
 * their own objects. The max size is driven by the `uploads.maxMegabytes` flag.
 */
async function uploadConstraints(): Promise<UploadConstraints> {
  const maxMegabytes = await getNumberFlag('uploads.maxMegabytes')
  return {
    maxBytes: maxMegabytes * 1024 * 1024,
    allowedContentTypes: UPLOAD_ALLOWED_CONTENT_TYPES,
  }
}

const fileMetaSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
})

export const requestUploadAction = rateLimitedActionClient
  .metadata({ actionName: 'uploads.requestUrl' })
  .inputSchema(fileMetaSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!isStorageConfigured()) {
      throw new Error('Object storage is not configured.')
    }
    validateUpload(
      { contentType: parsedInput.contentType, size: parsedInput.size },
      await uploadConstraints()
    )
    const objectKey = buildObjectKey(
      'uploads',
      ctx.user.id,
      parsedInput.filename
    )
    const uploadUrl = await getUploadUrl(objectKey, parsedInput.contentType)
    return { uploadUrl, objectKey }
  })

export const confirmUploadAction = authActionClient
  .metadata({ actionName: 'uploads.confirm' })
  .inputSchema(
    fileMetaSchema.extend({
      objectKey: z.string().trim().min(1),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    // Defense in depth: a user may only register an object under their own prefix.
    if (!parsedInput.objectKey.startsWith(`uploads/${ctx.user.id}/`)) {
      throw new ForbiddenError()
    }
    validateUpload(
      { contentType: parsedInput.contentType, size: parsedInput.size },
      await uploadConstraints()
    )
    const upload = await recordUpload({
      userId: ctx.user.id,
      bucket: getBucketName(),
      objectKey: parsedInput.objectKey,
      contentType: parsedInput.contentType,
      sizeBytes: parsedInput.size,
      originalName: parsedInput.filename,
    })
    revalidatePath('/dashboard/files')
    return upload
  })

export const deleteUploadAction = authActionClient
  .metadata({ actionName: 'uploads.delete' })
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const upload = await getUpload(ctx.user.id, parsedInput.id)
    if (!upload) throw new NotFoundError()
    // Delete the object first; only soft-delete the row once the bytes are gone,
    // so a storage failure leaves the record intact (no dangling reference).
    await deleteObject(upload.objectKey)
    await softDeleteUpload(ctx.user.id, parsedInput.id)
    revalidatePath('/dashboard/files')
  })

export const getDownloadUrlAction = authActionClient
  .metadata({ actionName: 'uploads.downloadUrl' })
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const upload = await getUpload(ctx.user.id, parsedInput.id)
    if (!upload) throw new NotFoundError()
    return { url: await getDownloadUrl(upload.objectKey) }
  })
