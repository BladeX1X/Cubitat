import { describe, expect, it, vi } from 'vitest'

import { logWorkerEvent } from './logger'

describe('logWorkerEvent', () => {
  it('emits a structured event containing only allowlisted fields', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    logWorkerEvent('warn', 'transactional_email_failed', {
      source: 'resend',
      status: 503,
      // Simulate an unexpected value reaching the logger at runtime.
      email: 'persona@example.com',
      url: 'https://example.com/callback?token=secret',
      error: new Error('provider body with sensitive data'),
    } as never)

    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith({
      event: 'transactional_email_failed',
      source: 'resend',
      status: 503,
    })
    warn.mockRestore()
  })

  it('drops invalid field values rather than serializing them', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    logWorkerEvent('info', 'auth_rate_limit_blocked', {
      action: 'x'.repeat(200),
      dimension: 'user-id',
      status: -1,
      reason: 'raw upstream response',
    } as never)

    expect(info).toHaveBeenCalledWith({ event: 'auth_rate_limit_blocked' })
    info.mockRestore()
  })

  it('allows KYC retention events without paths or request identifiers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    logWorkerEvent('warn', 'kyc_evidence_retention_partial_failure')

    expect(warn).toHaveBeenCalledWith({
      event: 'kyc_evidence_retention_partial_failure',
    })
    warn.mockRestore()
  })

  it('allows safe HTTP status logging for image duplicate request failures', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    logWorkerEvent('warn', 'image_duplicate_request_failed', { status: 503 })

    expect(warn).toHaveBeenCalledWith({
      event: 'image_duplicate_request_failed',
      status: 503,
    })
    warn.mockRestore()
  })
})
