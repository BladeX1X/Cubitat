import { describe, expect, it } from 'vitest'
import { completeDraftKey } from './completeDraftStorage'

describe('complete publication draft identity', () => {
  it('separates drafts belonging to the same user', () => {
    expect(completeDraftKey('owner', undefined, 'draft-1')).not.toBe(completeDraftKey('owner', undefined, 'draft-2'))
  })

  it('preserves the existing key for the single legacy draft and property edits', () => {
    expect(completeDraftKey('owner')).toBe(JSON.stringify(['owner', null]))
    expect(completeDraftKey('owner', 'property-1')).toBe(JSON.stringify(['owner', 'property-1']))
  })
})
