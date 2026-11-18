import { describe, expect, it } from 'vitest'
import { isOnlyWithdrawnHighFinding } from './audit-withdrawn-advisories.mjs'

const withdrawnUrl = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf'

describe('exception scope for withdrawn npm audit advisories', () => {
  it('allows the exact withdrawn advisory while it remains in the npm feed', () => {
    expect(isOnlyWithdrawnHighFinding({
      metadata: { vulnerabilities: { high: 12, critical: 0 } },
      vulnerabilities: {
        picomatch: {
          via: [{ url: withdrawnUrl, severity: 'high' }],
        },
        vite: { via: ['picomatch'] },
      },
    })).toBe(true)
  })

  it('keeps blocking any other high advisory', () => {
    expect(isOnlyWithdrawnHighFinding({
      metadata: { vulnerabilities: { high: 1, critical: 0 } },
      vulnerabilities: {
        other: { via: [{ url: 'https://github.com/advisories/OTHER', severity: 'high' }] },
      },
    })).toBe(false)
  })

  it('keeps blocking when the withdrawn advisory appears with another high advisory', () => {
    expect(isOnlyWithdrawnHighFinding({
      metadata: { vulnerabilities: { high: 2, critical: 0 } },
      vulnerabilities: {
        picomatch: { via: [{ url: withdrawnUrl, severity: 'high' }] },
        other: { via: [{ url: 'https://github.com/advisories/OTHER', severity: 'high' }] },
      },
    })).toBe(false)
  })
})
