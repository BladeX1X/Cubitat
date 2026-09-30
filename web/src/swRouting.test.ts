import { describe, expect, it } from 'vitest'
import { actionPathWithNotification, safeActionPath } from './swRouting'

const origin = 'https://cubitat.example'

describe('service worker notification routing', () => {
  it('keeps internal paths with query and hash', () => {
    expect(safeActionPath('/propiedad/property-1?from=push#contacto', origin))
      .toBe('/propiedad/property-1?from=push#contacto')
  })

  it('falls back home for external or malformed paths', () => {
    expect(safeActionPath('https://attacker.example/login', origin)).toBe('/')
    expect(safeActionPath('//attacker.example/login', origin)).toBe('/')
    expect(safeActionPath('/\\\\attacker.example/login', origin)).toBe('/')
    expect(safeActionPath('propiedad/property-1', origin)).toBe('/')
    expect(safeActionPath(null, origin)).toBe('/')
  })

  it('adds only a valid notification UUID to an internal destination', () => {
    expect(actionPathWithNotification(
      '/propiedad/property-1',
      '123e4567-e89b-12d3-a456-426614174000',
      origin,
    )).toBe('/propiedad/property-1?cubitat_notification=123e4567-e89b-12d3-a456-426614174000')

    expect(actionPathWithNotification('/mi-cuenta', 'not-a-uuid', origin))
      .toBe('/mi-cuenta')
  })
})
