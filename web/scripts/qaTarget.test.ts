import { describe, expect, it } from 'vitest'
import { assertLocalMutationTarget, assertLoopbackSecurityProbeTargets, assertSafeQaE2ETarget } from '../e2e/qaTarget'

describe('E2E network target guard', () => {
  it('permits a local app and local Supabase', () => {
    expect(() => assertSafeQaE2ETarget('http://127.0.0.1:5173', 'http://127.0.0.1:54321')).not.toThrow()
  })

  it('blocks external targets unless the cloud opt-in is explicit', () => {
    expect(() => assertSafeQaE2ETarget('https://cubitat1-phase2-dev.pochiprats18.workers.dev')).toThrow(/CUBITAT_E2E_ALLOW_CLOUD/)
    expect(() => assertSafeQaE2ETarget('https://cubitat1-phase2-dev.pochiprats18.workers.dev', 'https://bknwerqbbysveehcdmzr.supabase.co', true)).not.toThrow()
  })

  it('blocks mixed local and remote services even when cloud testing is enabled', () => {
    expect(() => assertSafeQaE2ETarget('http://127.0.0.1:5173', 'https://bknwerqbbysveehcdmzr.supabase.co', true)).toThrow(/no permite mezclar/)
  })

  it('requires HTTPS for external hosts and rejects embedded credentials', () => {
    expect(() => assertSafeQaE2ETarget('http://example.test:5173', undefined, true)).toThrow(/HTTPS/)
    expect(() => assertSafeQaE2ETarget('https://user:password@example.test', undefined, true)).toThrow(/credenciales/)
  })

  it('requires a Supabase target for an external app', () => {
    expect(() => assertSafeQaE2ETarget('https://example.test', undefined, true)).toThrow(/CUBITAT_E2E_SUPABASE_URL/)
  })

  it('allows mutation flows only when both app and Supabase are loopback', () => {
    expect(() => assertLocalMutationTarget('http://127.0.0.1:5181', 'http://localhost:54321')).not.toThrow()
    expect(() => assertLocalMutationTarget('https://cubitat1-phase2-dev.pochiprats18.workers.dev', 'https://bknwerqbbysveehcdmzr.supabase.co')).toThrow(/solo pueden ejecutarse.*locales/)
    expect(() => assertLocalMutationTarget('http://127.0.0.1:5181', 'https://bknwerqbbysveehcdmzr.supabase.co')).toThrow(/solo pueden ejecutarse.*locales/)
  })

  it('keeps authorization-boundary probes on loopback regardless of cloud opt-in', () => {
    expect(() => assertLoopbackSecurityProbeTargets('http://127.0.0.1:5174', 'http://127.0.0.1:54321')).not.toThrow()
    expect(() => assertLoopbackSecurityProbeTargets('https://cubitathome.com', 'https://tohjzoncoosvjbjcakdl.supabase.co')).toThrow(/limitadas a destinos loopback/)
  })
})
