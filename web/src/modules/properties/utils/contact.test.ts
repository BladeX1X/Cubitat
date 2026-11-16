import { describe, expect, it } from 'vitest'
import { getPropertyContactChannelUrl } from './contact'

const property = {
  title: 'Casa independiente en Playa',
  location: 'Playa, La Habana',
}

describe('getPropertyContactChannelUrl', () => {
  it('builds a phone link for the listing contact flow', () => {
    expect(getPropertyContactChannelUrl('phone', '+53 (512) 34567', property)).toBe('tel:+5351234567')
  })

  it('opens WhatsApp with a message that identifies the listing', () => {
    const url = getPropertyContactChannelUrl('whatsapp', '+53 51234567', property)

    expect(url).toContain('https://wa.me/5351234567?text=')
    expect(decodeURIComponent(url ?? '')).toContain('Casa independiente en Playa')
    expect(decodeURIComponent(url ?? '')).toContain('Playa, La Habana')
  })

  it('does not create a contact link for an invalid phone number', () => {
    expect(getPropertyContactChannelUrl('whatsapp', 'abc', property)).toBeNull()
  })
})
