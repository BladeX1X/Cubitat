import { describe, expect, it } from 'vitest'
import { calculateTrustScore } from './reputationCalculator'

describe('calculateTrustScore', () => {
  it('returns a low score and label "Nuevo" for a new unverified profile with no properties', () => {
    const today = new Date().toISOString()
    const result = calculateTrustScore({
      verificationStatus: 'unverified',
      createdAt: today,
      activePropertiesCount: 0,
      reportsCount: 0,
    })

    expect(result.score).toBeGreaterThanOrEqual(1.0)
    expect(result.score).toBeLessThan(3.5)
    expect(result.label).toBe('Nuevo')
  })

  it('returns a high score and label "Excelente" for a verified agent with high seniority and properties', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const result = calculateTrustScore({
      verificationStatus: 'verified',
      createdAt: oneYearAgo,
      activePropertiesCount: 10,
      reportsCount: 0,
    })

    expect(result.score).toBe(5.0)
    expect(result.label).toBe('Excelente')
  })

  it('returns "Verificado" label for verified accounts with moderate scores', () => {
    const today = new Date().toISOString()
    const result = calculateTrustScore({
      verificationStatus: 'verified',
      createdAt: today,
      activePropertiesCount: 0,
      reportsCount: 0,
    })

    expect(result.label).toBe('Verificado')
    expect(result.score).toBe(4.3)
  })

  it('applies penalties for reported profiles and clamps minimum score to 1.0', () => {
    const today = new Date().toISOString()
    const result = calculateTrustScore({
      verificationStatus: 'rejected',
      createdAt: today,
      activePropertiesCount: 0,
      reportsCount: 5,
    })

    expect(result.score).toBe(1.0)
    expect(result.label).toBe('Nuevo')
  })

  it('handles invalid date strings gracefully without throwing errors', () => {
    const result = calculateTrustScore({
      verificationStatus: 'unverified',
      createdAt: 'invalid-date-string',
      activePropertiesCount: 2,
      reportsCount: 0,
    })

    expect(result.score).toBe(3.2)
    expect(result.label).toBe('Nuevo')
  })
})
