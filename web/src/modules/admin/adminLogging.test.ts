import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logSafeEvent } from '../../shared/lib/logger'

describe('Admin Module - Safe Logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs admin errors without dumping raw Error objects or IDs', () => {
    logSafeEvent({
      module: 'admin',
      action: 'load_moderation_properties',
      level: 'error',
      code: 'PERMISSION_DENIED',
      context: {
        property_id: 'prop_sensitive_123',
        user_id: 'usr_admin_456',
        page: 0,
      },
    })

    expect(console.error).toHaveBeenCalledTimes(1)
    const [msg, context] = vi.mocked(console.error).mock.calls[0]
    expect(msg).toContain('[ADMIN:load_moderation_properties] ERROR (PERMISSION_DENIED)')
    expect(context.property_id).toBeUndefined()
    expect(context.user_id).toBeUndefined()
    expect(context.page).toBe(0)
  })
})
