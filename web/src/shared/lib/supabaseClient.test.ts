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
    await import('./supabaseClient')

    expect(createClientMock).toHaveBeenCalledTimes(1)
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
  })
})
