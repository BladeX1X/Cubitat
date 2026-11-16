import { describe, expect, it } from 'vitest'
import { PUBLIC_PROPERTY_SELECT } from './publicPropertySelect'

describe('PUBLIC_PROPERTY_SELECT', () => {
  it('keeps the public catalog projection away from private and revoked columns', () => {
    const fields = PUBLIC_PROPERTY_SELECT.split(',')

    expect(fields).toContain('id')
    expect(fields).toContain('images')
    expect(fields).toContain('coordinates')
    expect(fields).toContain('user_id')
    expect(fields).not.toContain('*')
    expect(fields).not.toContain('contact_info')
    expect(fields).not.toContain('moderation_message')
    expect(fields).not.toContain('phone_clicks_count')
    expect(fields).not.toContain('whatsapp_clicks_count')
  })
})
