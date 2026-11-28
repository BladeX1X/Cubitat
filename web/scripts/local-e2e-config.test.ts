import { describe, expect, it } from 'vitest'
import { parseLocalSupabaseStatus } from './local-e2e-config.mjs'

describe('parseLocalSupabaseStatus', () => {
  it('reads the local URL and public key without returning other values', () => {
    expect(parseLocalSupabaseStatus([
      'API_URL="http://127.0.0.1:54321"',
      'ANON_KEY="local-public-key"',
      'SERVICE_ROLE_KEY="local-private-key"',
    ].join('\n'))).toEqual({ url: 'http://127.0.0.1:54321', anonKey: 'local-public-key' })
  })

  it('rejects a hosted Supabase URL', () => {
    expect(() => parseLocalSupabaseStatus('API_URL="https://example.supabase.co"\nANON_KEY="public"'))
      .toThrow('El servidor E2E solo admite Supabase local en loopback.')
  })

  it('rejects incomplete local status output', () => {
    expect(() => parseLocalSupabaseStatus('API_URL="http://127.0.0.1:54321"'))
      .toThrow('Supabase local no devolvió API_URL y ANON_KEY.')
  })
})

