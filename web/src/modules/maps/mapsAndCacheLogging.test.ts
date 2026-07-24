import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logSafeEvent } from '../../shared/lib/logger'

describe('Maps & Cache Module - Safe Logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs map and cache errors safely without exposing raw error objects or URLs', () => {
    logSafeEvent({
      module: 'maps',
      action: 'init_maplibre',
      level: 'error',
      code: 'NETWORK_ERROR',
      context: {
        map_style: 'openfreemap',
      },
    })

    expect(console.error).toHaveBeenCalledTimes(1)
    const [msg, context] = vi.mocked(console.error).mock.calls[0]
    expect(msg).toContain('[MAPS:init_maplibre] ERROR (NETWORK_ERROR)')
    expect(context.map_style).toBe('openfreemap')
  })
})
