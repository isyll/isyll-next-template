import { userAuth } from '@workspace/auth'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { listUploads } from '@/features/uploads/queries'
import { getNumberFlag } from '@/lib/feature-flags'
import { getDownloadUrl, isStorageConfigured } from '@/lib/storage'
import { isImageContentType } from '@/lib/upload'

import { FileManager, type FileItem } from './file-manager'

export default async function FilesPage() {
  const session = await userAuth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect('/login')
  }

  const t = await getTranslations('Files')
  const configured = isStorageConfigured()
  const maxMegabytes = await getNumberFlag('uploads.maxMegabytes')

  const uploads = configured ? await listUploads(session.user.id) : []
  // Private objects: mint a short-lived presigned URL for image previews.
  const items: FileItem[] = await Promise.all(
    uploads.map(async (upload) => ({
      id: upload.id,
      name: upload.originalName ?? upload.objectKey.split('/').at(-1) ?? 'file',
      contentType: upload.contentType,
      sizeBytes: upload.sizeBytes,
      previewUrl: isImageContentType(upload.contentType)
        ? await getDownloadUrl(upload.objectKey)
        : null,
    }))
  )

  return (
    <main className='mx-auto w-full max-w-3xl space-y-8 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground'>{t('subtitle')}</p>
      </div>
      {configured ? (
        <FileManager
          initialItems={items}
          maxBytes={maxMegabytes * 1024 * 1024}
        />
      ) : (
        <p className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
          {t('disabled')}
        </p>
      )}
    </main>
  )
}
