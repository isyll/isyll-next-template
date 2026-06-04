import { ValidationError } from '@workspace/core'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_IMAGE_CONSTRAINTS,
  buildObjectKey,
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
