import { describe, expect, it } from 'vitest'
import {
  AVATAR_IMAGE_RULES,
  PROPERTY_IMAGE_RULES,
  validateImageDimensions,
  validateImageFile,
} from './imageSecurity'

describe('image upload security', () => {
  it('accepts supported image files within the configured size', () => {
    const file = { type: 'image/jpeg', size: PROPERTY_IMAGE_RULES.maxInputBytes } as File

    expect(validateImageFile(file, PROPERTY_IMAGE_RULES)).toBeNull()
  })

  it('rejects unsupported formats and oversized files before decoding', () => {
    expect(validateImageFile({ type: 'image/svg+xml', size: 1 } as File, PROPERTY_IMAGE_RULES))
      .toMatch(/formato/i)
    expect(validateImageFile({ type: 'image/png', size: AVATAR_IMAGE_RULES.maxInputBytes + 1 } as File, AVATAR_IMAGE_RULES))
      .toMatch(/MB/i)
  })

  it('rejects empty or excessively large decoded images', () => {
    expect(validateImageDimensions(0, 100, PROPERTY_IMAGE_RULES)).toMatch(/dimensiones/i)
    expect(validateImageDimensions(10_000, 10_000, PROPERTY_IMAGE_RULES)).toMatch(/resoluci/i)
    expect(validateImageDimensions(2_000, 2_000, PROPERTY_IMAGE_RULES)).toBeNull()
  })
})
