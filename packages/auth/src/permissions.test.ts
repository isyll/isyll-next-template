import { describe, expect, it } from 'vitest'

import { ADMIN_PERMISSION_KEYS, ADMIN_PERMISSIONS } from './permissions'

describe('admin permission catalogue', () => {
  it('exposes keys that exactly match the catalogue entries', () => {
    expect(ADMIN_PERMISSION_KEYS).toEqual(ADMIN_PERMISSIONS.map((p) => p.key))
  })

  it('has unique keys', () => {
    const keys = ADMIN_PERMISSIONS.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('uses the `resource.action` key convention with a description', () => {
    for (const permission of ADMIN_PERMISSIONS) {
      expect(permission.key).toMatch(/^[a-z_]+\.[a-z_]+$/)
      expect(permission.description.length).toBeGreaterThan(0)
    }
  })

  it('always includes console.access (the gate to the admin console)', () => {
    expect(ADMIN_PERMISSION_KEYS).toContain('console.access')
  })
})
