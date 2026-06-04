import { ValidationError } from '@workspace/core'

/**
 * Pure upload helpers (no I/O) — safe to import anywhere and unit-test.
 * The S3 side-effects live in `@/lib/storage` (server-only).
 */
export interface UploadConstraints {
  /** Maximum size in bytes. */
  maxBytes: number
  /** Allowed MIME types (exact match). */
  allowedContentTypes: readonly string[]
}

/** Sensible default: images up to 5 MB. Override per upload kind. */
export const DEFAULT_IMAGE_CONSTRAINTS: UploadConstraints = {
  maxBytes: 5 * 1024 * 1024,
  allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif'],
}

/** Throw a (operational) ValidationError if the upload violates constraints. */
export function validateUpload(
  input: { contentType: string; size: number },
  constraints: UploadConstraints
): void {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new ValidationError('The file is empty.', {
      fieldErrors: { file: ['The file is empty.'] },
    })
  }
  if (input.size > constraints.maxBytes) {
    throw new ValidationError('The file is too large.', {
      fieldErrors: {
        file: [`The file exceeds ${String(constraints.maxBytes)} bytes.`],
      },
    })
  }
  if (!constraints.allowedContentTypes.includes(input.contentType)) {
    throw new ValidationError('Unsupported file type.', {
      fieldErrors: { file: [`Unsupported type: ${input.contentType}.`] },
    })
  }
}

/**
 * Build a collision-resistant, path-traversal-safe object key namespaced by
 * owner: `<prefix>/<userId>/<timestamp>-<sanitized-filename>`.
 */
export function buildObjectKey(
  prefix: string,
  userId: string,
  filename: string
): string {
  const safeName = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // collapse dot runs so no `..` traversal remains
    .slice(-100)
  const safePrefix = prefix.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${safePrefix}/${userId}/${String(Date.now())}-${safeName}`
}
