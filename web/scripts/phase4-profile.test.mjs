import { describe, expect, it } from 'vitest'
import { resolvePhase4Flags } from './phase4-profile.mjs'

describe('phase 4 production profile', () => {
  it('keeps valuation disabled while publishing the other production modules', () => {
    expect(resolvePhase4Flags({ phase4Production: true, phase2DevBuild: false, env: {} })).toEqual({
      svc: true,
      rev: true,
      mat: true,
      biz: true,
      val: false,
    })
  })

  it('allows valuation only in an explicitly opted-in DEV build', () => {
    expect(resolvePhase4Flags({ phase4Production: false, phase2DevBuild: true, env: { VITE_PHASE4_VAL_ENABLED: 'true' } }).val).toBe(true)
    expect(resolvePhase4Flags({ phase4Production: true, phase2DevBuild: false, env: { VITE_PHASE4_VAL_ENABLED: 'true' } }).val).toBe(false)
  })
})
