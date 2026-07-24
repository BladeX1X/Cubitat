import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logSafeEvent } from '../lib/logger'

describe('ErrorBoundary & UI Core Module - Safe Logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs error boundary uncaught errors safely without dumping component tree or raw error object', () => {
    logSafeEvent({
      module: 'error_boundary',
      action: 'uncaught_error',
      level: 'error',
      code: 'TypeError',
    })

    expect(console.error).toHaveBeenCalledTimes(1)
    const [msg] = vi.mocked(console.error).mock.calls[0]
    expect(msg).toContain('[ERROR_BOUNDARY:uncaught_error] ERROR (TypeError)')
  })
})
