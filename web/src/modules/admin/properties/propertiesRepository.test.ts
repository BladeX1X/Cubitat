import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hideModerationProperty, restoreModerationProperty } from './propertiesRepository'

const { fromMock, updateMock, eqMock, selectMock, singleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  selectMock: vi.fn(),
  singleMock: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}))

describe('administrative visibility repository', () => {
  beforeEach(() => {
    const query = { update: updateMock, eq: eqMock, select: selectMock, single: singleMock }
    fromMock.mockReset().mockReturnValue(query)
    updateMock.mockReset().mockReturnValue(query)
    eqMock.mockReset().mockReturnValue(query)
    selectMock.mockReset().mockReturnValue(query)
    singleMock.mockReset().mockResolvedValue({ data: { id: 'property-1' }, error: null })
  })

  it('hides only a currently published property with an administrative reason', async () => {
    await hideModerationProperty('property-1', 'Información desactualizada')

    expect(updateMock).toHaveBeenCalledWith({
      status: 'paused',
      moderation_message: 'Información desactualizada',
    })
    expect(eqMock).toHaveBeenNthCalledWith(1, 'id', 'property-1')
    expect(eqMock).toHaveBeenNthCalledWith(2, 'status', 'published')
    expect(selectMock).toHaveBeenCalledWith('id')
  })

  it('restores only an administratively paused property', async () => {
    await restoreModerationProperty('property-2')

    expect(updateMock).toHaveBeenCalledWith({ status: 'published', moderation_message: null })
    expect(eqMock).toHaveBeenNthCalledWith(2, 'status', 'paused')
    expect(singleMock).toHaveBeenCalled()
  })
})
