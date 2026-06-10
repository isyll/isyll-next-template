import { describe, expect, it } from 'vitest'

import {
  defaultNotificationPreferences,
  mergePreferences,
  NOTIFICATION_CHANNELS,
} from '@/features/notifications/channels'

describe('notification channels', () => {
  it('lists the known channels', () => {
    expect(NOTIFICATION_CHANNELS).toEqual(['in_app', 'email'])
  })

  it('defaults every channel to enabled', () => {
    expect(defaultNotificationPreferences()).toEqual({
      in_app: true,
      email: true,
    })
  })

  it('overlays stored rows on the defaults', () => {
    expect(mergePreferences([{ channel: 'email', enabled: false }])).toEqual({
      in_app: true,
      email: false,
    })
  })

  it('leaves channels without a row at their default', () => {
    expect(mergePreferences([])).toEqual({ in_app: true, email: true })
  })
})
