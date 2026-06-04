import { ValidationError } from '@workspace/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the pino logger so the real one isn't constructed under jsdom and we can
// assert on what gets logged.
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

import { logger } from '@/lib/logger'
import { reportError } from '@/lib/observability'

describe('reportError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an operational AppError and logs it at warn level', () => {
    const result = reportError(new ValidationError('bad input'), {
      action: 'createWidget',
    })
    expect(result.isOperational).toBe(true)
    expect(result.message).toBe('bad input')
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('normalizes unknown throwables to a non-operational InternalError at error level', () => {
    const result = reportError('boom')
    expect(result.code).toBe('INTERNAL')
    expect(result.isOperational).toBe(false)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('forwards context to the logger', () => {
    reportError(new ValidationError('x'), { action: 'a', scope: 'action' })
    const [payload] = vi.mocked(logger.warn).mock.calls[0] ?? []
    expect(payload).toMatchObject({ action: 'a', scope: 'action' })
  })
})
