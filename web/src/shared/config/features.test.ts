import { describe, expect, it } from 'vitest'
import { isPhaseTwoEnabled } from './features'

describe('Phase 2 environment boundary', () => {
  it('is enabled only in development against a local Supabase project', () => {
    expect(isPhaseTwoEnabled(true, 'http://127.0.0.1:54321')).toBe(true)
    expect(isPhaseTwoEnabled(true, 'http://localhost:54321')).toBe(true)
    expect(isPhaseTwoEnabled(false, 'http://127.0.0.1:54321')).toBe(false)
    expect(isPhaseTwoEnabled(true, 'https://project.supabase.co')).toBe(false)
    expect(isPhaseTwoEnabled(true, '')).toBe(false)
  })

  it('enables Phase 2 in an explicit build when the DEV project URL is injected', () => {
    expect(isPhaseTwoEnabled(false, 'https://bknwerqbbysveehcdmzr.supabase.co', true)).toBe(true)
  })
})
