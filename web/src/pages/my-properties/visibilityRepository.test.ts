import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hideOwnProperty, restoreOwnProperty } from './visibilityRepository'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { rpc: rpcMock },
}))

describe('owner visibility repository', () => {
  beforeEach(() => {
    rpcMock.mockReset().mockResolvedValue({ error: null })
  })

  it('hides only the owner current published row', async () => {
    await hideOwnProperty('property-1', 'owner-1')
    expect(rpcMock).toHaveBeenCalledWith('hide_own_property', { p_property_id: 'property-1' })
  })

  it('restores only the owner current owner-hidden row', async () => {
    await restoreOwnProperty('property-2', 'owner-1')
    expect(rpcMock).toHaveBeenCalledWith('restore_own_property', { p_property_id: 'property-2' })
  })
})
