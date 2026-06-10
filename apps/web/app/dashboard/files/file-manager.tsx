'use client'

import { Download, FileText, Loader2, Trash2, UploadCloud } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@workspace/ui/components/button'

import { formatBytes, UPLOAD_ALLOWED_CONTENT_TYPES } from '@/lib/upload'

import {
  confirmUploadAction,
  deleteUploadAction,
  getDownloadUrlAction,
  requestUploadAction,
} from './actions'

export interface FileItem {
  id: string
  name: string
  contentType: string
  sizeBytes: number
  previewUrl: string | null
}

const ACCEPT = UPLOAD_ALLOWED_CONTENT_TYPES.join(',')
const ALLOWED = new Set<string>(UPLOAD_ALLOWED_CONTENT_TYPES)

export function FileManager({
  initialItems,
  maxBytes,
}: {
  initialItems: FileItem[]
  maxBytes: number
}) {
  const t = useTranslations('Files')
  const tErr = useTranslations('Errors')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState<string[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  async function uploadOne(file: File): Promise<void> {
    if (!ALLOWED.has(file.type)) {
      toast.error(t('badType', { name: file.name }))
      return
    }
    if (file.size > maxBytes) {
      toast.error(t('tooLarge', { name: file.name }))
      return
    }
    setUploading((prev) => [...prev, file.name])
    try {
      const requested = await requestUploadAction({
        filename: file.name,
        contentType: file.type,
        size: file.size,
      })
      const grant = requested.data
      if (!grant) throw new Error('request failed')

      const put = await fetch(grant.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!put.ok) throw new Error('upload failed')

      const confirmed = await confirmUploadAction({
        objectKey: grant.objectKey,
        filename: file.name,
        contentType: file.type,
        size: file.size,
      })
      if (!confirmed.data) throw new Error('confirm failed')
      toast.success(t('uploaded', { name: file.name }))
    } catch {
      toast.error(t('uploadError', { name: file.name }))
    } finally {
      setUploading((prev) => prev.filter((name) => name !== file.name))
    }
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return
    await Promise.all(Array.from(files).map((file) => uploadOne(file)))
    router.refresh()
  }

  async function onDelete(item: FileItem): Promise<void> {
    setBusyId(item.id)
    const result = await deleteUploadAction({ id: item.id })
    setBusyId(null)
    if (result.serverError) {
      toast.error(tErr('generic'))
      return
    }
    toast.success(t('deleted'))
    router.refresh()
  }

  async function onDownload(item: FileItem): Promise<void> {
    setBusyId(item.id)
    const result = await getDownloadUrlAction({ id: item.id })
    setBusyId(null)
    const url = result.data?.url
    if (!url) {
      toast.error(tErr('generic'))
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const isEmpty = initialItems.length === 0 && uploading.length === 0

  return (
    <div className='space-y-6'>
      <button
        type='button'
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <UploadCloud className='size-8 text-muted-foreground' aria-hidden />
        <span className='font-medium'>{t('dropzone')}</span>
        <span className='text-xs text-muted-foreground'>
          {t('dropzoneHint', { max: formatBytes(maxBytes) })}
        </span>
      </button>
      <input
        ref={inputRef}
        type='file'
        multiple
        accept={ACCEPT}
        className='sr-only'
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {isEmpty ? (
        <p className='text-center text-sm text-muted-foreground'>
          {t('empty')}
        </p>
      ) : (
        <ul className='grid gap-3 sm:grid-cols-2'>
          {uploading.map((name) => (
            <li
              key={`uploading-${name}`}
              className='flex items-center gap-3 rounded-md border bg-card p-3 text-sm text-muted-foreground'
            >
              <Loader2 className='size-5 animate-spin' aria-hidden />
              <span className='truncate'>{t('uploadingName', { name })}</span>
            </li>
          ))}
          {initialItems.map((item) => (
            <li
              key={item.id}
              className='flex items-center gap-3 rounded-md border bg-card p-3'
            >
              {item.previewUrl ? (
                <span
                  role='img'
                  aria-label={item.name}
                  style={{ backgroundImage: `url(${item.previewUrl})` }}
                  className='size-12 shrink-0 rounded bg-muted bg-cover bg-center'
                />
              ) : (
                <FileText
                  className='size-12 shrink-0 rounded bg-muted p-2.5 text-muted-foreground'
                  aria-hidden
                />
              )}
              <div className='min-w-0 flex-1'>
                <div className='truncate font-medium'>{item.name}</div>
                <div className='text-xs text-muted-foreground'>
                  {formatBytes(item.sizeBytes)}
                </div>
              </div>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                disabled={busyId === item.id}
                aria-label={t('download')}
                onClick={() => {
                  void onDownload(item)
                }}
              >
                <Download className='size-4' aria-hidden />
              </Button>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                disabled={busyId === item.id}
                aria-label={t('delete')}
                onClick={() => {
                  void onDelete(item)
                }}
              >
                <Trash2 className='size-4' aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
