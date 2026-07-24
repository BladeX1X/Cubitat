import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logSafeEvent } from '../../shared/lib/logger'

describe('Auth Module - Safe Logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs auth errors using logSafeEvent without exposing credentials or emails', () => {
    logSafeEvent({
      module: 'auth',
      action: 'login',
      level: 'error',
      code: 'Invalid login credentials',
      context: {
        attempted_email: 'secret@domain.com',
        user_id: 'secret_id',
      },
    })

    expect(console.error).toHaveBeenCalledTimes(1)
    const [msg, context] = vi.mocked(console.error).mock.calls[0]
    expect(msg).toContain('[AUTH:login] ERROR (Invalid login credentials)')
    expect(context.attempted_email).toBeUndefined()
    expect(context.user_id).toBeUndefined()
  })
})
