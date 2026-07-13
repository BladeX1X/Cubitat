import { describe, expect, it } from 'vitest'
import { getPropertyStatusConfig } from './propertyStatus'

describe('getPropertyStatusConfig', () => {
  it('presenta los borradores remotos sin romper la página', () => {
    expect(getPropertyStatusConfig('draft')).toEqual({
      label: 'Borrador',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    })
  })
})
