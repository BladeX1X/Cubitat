import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('does not expose raw backend details', () => {
    expect(getErrorMessage(new Error('private backend details'), 'Ocurrió un error.'))
      .toBe('Ocurrió un error.')
  })

  it('uses the fallback for unknown errors', () => {
    expect(getErrorMessage({ message: 'private backend details' }, 'Inténtalo de nuevo.'))
      .toBe('Inténtalo de nuevo.')
  })
})
