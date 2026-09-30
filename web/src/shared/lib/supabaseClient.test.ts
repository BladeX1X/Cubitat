import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(() => ({ auth: {} })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

describe('Supabase Auth PKCE configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('leaves callback code exchange exclusively to AuthCallbackPage', async () => {
    vi.stubGlobal('window', undefined)
    await import('./supabaseClient')

    expect(createClientMock).toHaveBeenCalledTimes(2)
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

    expect(createClientMock).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        auth: expect.objectContaining({
          detectSessionInUrl: false,
          flowType: 'implicit',
          persistSession: true,
        }),
      }),
    )
    vi.unstubAllGlobals()
  })
})
