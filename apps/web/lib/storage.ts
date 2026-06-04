import 'server-only'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '@/env'

/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, ...). Server-only.
 *
 * Prefer the presigned-URL flow: the browser PUTs the file straight to storage
 * with `getUploadUrl`, and reads via short-lived `getDownloadUrl` — bytes never
 * pass through the app server. Configure with the S3_* env vars.
 */
interface StorageConfig {
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
  forcePathStyle?: boolean
}

/** Whether object storage is fully configured. */
export function isStorageConfigured(): boolean {
  return Boolean(
    env.S3_REGION &&
    env.S3_BUCKET &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY
  )
}

function getConfig(): StorageConfig {
  const region = env.S3_REGION
  const bucket = env.S3_BUCKET
  const accessKeyId = env.S3_ACCESS_KEY_ID
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Object storage is not configured — set the S3_* env vars.')
  }
  return {
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    ...(env.S3_FORCE_PATH_STYLE ? { forcePathStyle: true } : {}),
  }
}

let cachedClient: S3Client | null = null
function getClient(config: StorageConfig): S3Client {
  cachedClient ??= new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    ...(config.forcePathStyle ? { forcePathStyle: true } : {}),
  })
  return cachedClient
}

const DEFAULT_EXPIRY_SECONDS = 900

/** A short-lived presigned URL the browser can PUT the file to directly. */
export function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = DEFAULT_EXPIRY_SECONDS
): Promise<string> {
  const config = getConfig()
  return getSignedUrl(
    getClient(config),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  )
}

/** A short-lived presigned URL to read a private object. */
export function getDownloadUrl(
  key: string,
  expiresIn: number = DEFAULT_EXPIRY_SECONDS
): Promise<string> {
  const config = getConfig()
  return getSignedUrl(
    getClient(config),
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
    { expiresIn }
  )
}

/** Permanently delete an object from the bucket. */
export async function deleteObject(key: string): Promise<void> {
  const config = getConfig()
  await getClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key })
  )
}
