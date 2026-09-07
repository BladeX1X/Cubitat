import { describe, expect, it } from 'vitest'
import { buildKycWebPName, getKycImageTargetSize } from './kycImageCompression'

describe('KYC image compression helpers', () => {
  it('limits the longest side while preserving the aspect ratio', () => {
    expect(getKycImageTargetSize(2400, 1200)).toEqual({ width: 1600, height: 800 })
    expect(getKycImageTargetSize(900, 1800)).toEqual({ width: 800, height: 1600 })
    expect(getKycImageTargetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('uses a metadata-free WebP filename', () => {
    expect(buildKycWebPName('carnet.identidad.JPG')).toBe('carnet.identidad.webp')
    expect(buildKycWebPName('selfie')).toBe('selfie.webp')
  })
})
