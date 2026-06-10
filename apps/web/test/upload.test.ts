import { ValidationError } from '@workspace/core'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_IMAGE_CONSTRAINTS,
  buildObjectKey,
  formatBytes,
  isImageContentType,
  validateUpload,
} from '@/lib/upload'

describe('validateUpload', () => {
  it('accepts a valid file', () => {
    expect(() => {
      validateUpload(
        { contentType: 'image/png', size: 1024 },
        DEFAULT_IMAGE_CONSTRAINTS
      )
    }).not.toThrow()
  })

  it('rejects an empty file', () => {
    expect(() => {
      validateUpload(
        { contentType: 'image/png', size: 0 },
        DEFAULT_IMAGE_CONSTRAINTS
      )
    }).toThrow(ValidationError)
  })

  it('rejects a file over the size limit', () => {
    expect(() => {
      validateUpload(
        {
          contentType: 'image/png',
          size: DEFAULT_IMAGE_CONSTRAINTS.maxBytes + 1,
        },
        DEFAULT_IMAGE_CONSTRAINTS
      )
    }).toThrow(ValidationError)
  })

  it('rejects a disallowed content type', () => {
    expect(() => {
      validateUpload(
        { contentType: 'application/pdf', size: 100 },
        DEFAULT_IMAGE_CONSTRAINTS
      )
    }).toThrow(/Unsupported file type/)
  })
})

describe('buildObjectKey', () => {
  it('namespaces by prefix + user and sanitizes the filename', () => {
    const key = buildObjectKey(
      'avatars',
      'user_1',
      '../../etc/passwd photo.png'
    )
    expect(key.startsWith('avatars/user_1/')).toBe(true)
    expect(key).not.toContain('..')
    expect(key).not.toContain(' ')
    expect(key).toMatch(/avatars\/user_1\/\d+-.*passwd_photo\.png$/)
  })
})

describe('formatBytes', () => {
  it('formats across units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })

  it('handles invalid input safely', () => {
    expect(formatBytes(-1)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})

describe('isImageContentType', () => {
  it('detects image types', () => {
    expect(isImageContentType('image/png')).toBe(true)
    expect(isImageContentType('image/webp')).toBe(true)
    expect(isImageContentType('application/pdf')).toBe(false)
  })
})
