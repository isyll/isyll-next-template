'use server'

import { getTranslations } from 'next-intl/server'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'

import { authActionClient } from '@/lib/safe-action'

import { createPost, deletePostForAuthor } from './queries'

export const createPostAction = authActionClient
  .metadata({ actionName: 'createPost' })
  // Async schema factory → validation messages reflect the current locale.
  .inputSchema(async () => {
    const t = await getTranslations('Validation')
    return z.object({
      title: z
        .string()
        .min(1, t('required'))
        .max(200, t('max', { max: 200 })),
      content: z
        .string()
        .max(10_000, t('max', { max: 10_000 }))
        .optional(),
    })
  })
  .action(async ({ parsedInput, ctx }) => {
    const post = await createPost({
      authorId: ctx.user.id,
      title: parsedInput.title,
      content: parsedInput.content ?? null,
    })
    revalidatePath('/dashboard')
    return { post }
  })

export const deletePostAction = authActionClient
  .metadata({ actionName: 'deletePost' })
  .inputSchema(z.object({ id: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    await deletePostForAuthor(parsedInput.id, ctx.user.id)
    revalidatePath('/dashboard')
    return { id: parsedInput.id }
  })
