import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({ auth: {} })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

describe('Supabase Auth client configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test-supabase.invalid')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses one PKCE Auth client for callbacks and portable recovery OTPs', async () => {
    vi.stubGlobal('window', undefined)
    await import('./supabaseClient')

    expect(createClientMock).toHaveBeenCalledTimes(1)
    const configuredUrl = (createClientMock.mock.calls as unknown[][])[0]?.[0]
    expect(configuredUrl).not.toBe('https://tohjzoncoosvjbjcakdl.supabase.co')
    expect(configuredUrl).toEqual(expect.any(String))
    expect(createClientMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: expect.objectContaining({
          detectSessionInUrl: false,
          flowType: 'pkce',
          persistSession: true,
        }),
      }),
    )
    vi.unstubAllGlobals()
  })
})
