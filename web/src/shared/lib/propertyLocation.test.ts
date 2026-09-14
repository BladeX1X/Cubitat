import { describe, expect, it } from 'vitest'
import { publicPropertyLocation, editablePropertyAddress } from './propertyLocation'

describe('property address privacy', () => {
  it('keeps only catalogued municipality and province from a full address', () => {
    expect(publicPropertyLocation('Calle 23, edificio 41, Vedado, Plaza de la Revolucion, La Habana'))
      .toBe('Plaza de la Revolución, La Habana')
  })
  it('never publishes unknown street or neighborhood text', () => {
    expect(publicPropertyLocation('Calle 25 número 88')).toBe('Cuba')
    expect(publicPropertyLocation('Calle 88, Barrio privado, La Habana')).toBe('La Habana')
    expect(publicPropertyLocation('Calle 88, Playa, Matanzas')).toBe('Matanzas')
  })
  it('preserves all ambiguous address text privately without guessing a neighborhood', () => {
    expect(editablePropertyAddress('Calle 23, edificio 41, Vedado, Plaza de la Revolucion, La Habana'))
      .toEqual({ streetAddress: 'Calle 23, edificio 41, Vedado', neighborhood: '', municipality: 'Plaza de la Revolución', province: 'La Habana' })
    expect(editablePropertyAddress('Ubicación antigua sin formato').streetAddress).toBe('Ubicación antigua sin formato')
  })
})
