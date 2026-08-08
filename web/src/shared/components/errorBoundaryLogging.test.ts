import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ErrorInfo } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

describe('ErrorBoundary & UI Core Module - Safe Logging', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs error boundary uncaught errors safely without dumping component tree or raw error object', () => {
    const boundary = new ErrorBoundary({ children: null })
    const error = new TypeError('private user@test.com')
    const errorInfo = { componentStack: '\n at PrivateComponent' } as ErrorInfo

    boundary.componentDidCatch(error, errorInfo)

    expect(console.error).toHaveBeenCalledTimes(1)
    const [msg, context] = vi.mocked(console.error).mock.calls[0]
    expect(msg).toContain('[ERROR_BOUNDARY:uncaught_error] ERROR (CLIENT_TYPE_ERROR)')
    expect(msg).not.toContain('user@test.com')
    expect(context).not.toBe(error)
    expect(context).not.toBe(errorInfo)
  })
})
