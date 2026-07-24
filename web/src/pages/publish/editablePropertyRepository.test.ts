import { beforeEach, describe, expect, it, vi } from 'vitest'

const { maybeSingle, eqUserId, eqPropertyId, select, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eqUserId = vi.fn(() => ({ maybeSingle }))
  const eqPropertyId = vi.fn(() => ({ eq: eqUserId }))
  const select = vi.fn(() => ({ eq: eqPropertyId }))
  const from = vi.fn(() => ({ select }))
  return { maybeSingle, eqUserId, eqPropertyId, select, from }
})

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { from },
}))

import { getEditableProperty } from './editablePropertyRepository'

describe('getEditableProperty', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('limita la lectura al id de la propiedad y al usuario propietario', async () => {
    await getEditableProperty('property-123', 'owner-456')

    expect(from).toHaveBeenCalledWith('properties')
    expect(select).toHaveBeenCalledWith('*')
    expect(eqPropertyId).toHaveBeenCalledWith('id', 'property-123')
    expect(eqUserId).toHaveBeenCalledWith('user_id', 'owner-456')
    expect(maybeSingle).toHaveBeenCalledOnce()
  })
})
