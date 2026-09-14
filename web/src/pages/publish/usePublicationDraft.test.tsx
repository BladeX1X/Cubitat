import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePublicationDraft } from './usePublicationDraft'
import { readCompleteDraft, saveCompleteDraft, removeCompleteDraft } from './completeDraftStorage'
vi.mock('./completeDraftStorage', () => ({ readCompleteDraft: vi.fn(), saveCompleteDraft: vi.fn().mockResolvedValue(undefined), removeCompleteDraft: vi.fn().mockResolvedValue(undefined) }))
const value = { formData: { description: 'A' }, images: [{ dataUrl: 'data:image/webp;base64,YQ==', size: 1, name: 'a.webp' }], step: 6, existingAmenities: [] }
beforeEach(() => vi.clearAllMocks())
describe('publication autosave lifecycle', () => {
  it('does not overwrite persisted photos while hydration is pending', async () => {
    let resolve!: (draft: typeof value) => void
    vi.mocked(readCompleteDraft).mockReturnValue(new Promise(r => { resolve = r }))
    const restore = vi.fn()
    const { result } = renderHook(() => usePublicationDraft('A', 'property', false, value, restore))
    expect(saveCompleteDraft).not.toHaveBeenCalled()
    await act(async () => resolve(value))
    expect(restore).toHaveBeenCalledWith(value)
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(saveCompleteDraft).toHaveBeenCalledWith('A', value, 'property')
  })
  it('autosaves changed photos and step and never recreates a removed successful draft', async () => {
    vi.mocked(readCompleteDraft).mockResolvedValue(null)
    const restore = vi.fn()
    const { result, rerender, unmount } = renderHook(({ draft }) => usePublicationDraft('A', undefined, false, draft, restore), { initialProps: { draft: value } })
    await waitFor(() => expect(result.current.ready).toBe(true))
    const updated = { ...value, step: 8, images: [] }
    rerender({ draft: updated })
    await waitFor(() => expect(saveCompleteDraft).toHaveBeenLastCalledWith('A', updated, undefined))
    await act(async () => result.current.discard())
    const calls = vi.mocked(saveCompleteDraft).mock.calls.length
    rerender({ draft: value })
    unmount()
    expect(saveCompleteDraft).toHaveBeenCalledTimes(calls)
    expect(removeCompleteDraft).toHaveBeenCalledWith('A', undefined)
  })
  it('ignores hydration after unmount and keeps user and edit keys distinct', async () => {
    let resolve!: (draft: typeof value) => void
    vi.mocked(readCompleteDraft).mockReturnValue(new Promise(r => { resolve = r }))
    const restore = vi.fn()
    const { unmount } = renderHook(() => usePublicationDraft('B', 'other', false, value, restore))
    unmount()
    await act(async () => resolve(value))
    expect(restore).not.toHaveBeenCalled()
    expect(saveCompleteDraft).not.toHaveBeenCalled()
    expect(readCompleteDraft).toHaveBeenCalledWith('B', 'other')
  })
})
