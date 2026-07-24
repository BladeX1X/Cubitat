import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logSafeEvent } from '../../shared/lib/logger'

describe('Properties & Publishing Module - Safe Logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs publish and property errors safely without exposing IDs or sensitive form content', () => {
    logSafeEvent({
      module: 'publish',
      action: 'publish_property',
      level: 'error',
      code: 'STORAGE_UPLOAD_FAILED',
      context: {
        property_id: 'prop_99999',
        user_id: 'usr_owner_111',
        step: 2,
      },
    })

    expect(console.error).toHaveBeenCalledTimes(1)
    const [msg, context] = vi.mocked(console.error).mock.calls[0]
    expect(msg).toContain('[PUBLISH:publish_property] ERROR (STORAGE_UPLOAD_FAILED)')
    expect(context.property_id).toBeUndefined()
    expect(context.user_id).toBeUndefined()
    expect(context.step).toBe(2)
  })
})
