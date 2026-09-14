import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModerationProperty, StatusCounts } from '../core/types'
import { useModerationProperties } from './useModerationProperties'

const mocks = vi.hoisted(() => ({
  fetchModerationProperties: vi.fn(),
  fetchStatusCounts: vi.fn(),
  updateModerationPropertyStatus: vi.fn(),
  requestAiReevaluation: vi.fn(),
  waitForModerationResult: vi.fn(),
}))

vi.mock('./propertiesRepository', () => ({
  deleteModerationProperty: vi.fn(),
  fetchModerationProperties: mocks.fetchModerationProperties,
  fetchStatusCounts: mocks.fetchStatusCounts,
  hideModerationProperty: vi.fn(),
  requestAiReevaluation: mocks.requestAiReevaluation,
  restoreModerationProperty: vi.fn(),
  updateModerationPropertyStatus: mocks.updateModerationPropertyStatus,
}))

vi.mock('./moderationPolling', () => ({
  waitForModerationResult: mocks.waitForModerationResult,
}))

const property = {
  id: 'property-1',
  user_id: 'owner-1',
  title: 'Casa de prueba',
  status: 'pending_review',
  moderation_message: 'Servicio de IA no disponible. Pendiente de revisión manual.',
} as ModerationProperty

const counts = {
  pending_review: 1,
  ai_approved: 0,
  ai_rejected: 0,
  published: 0,
  paused: 0,
  owner_hidden: 0,
  all: 1,
} satisfies StatusCounts

describe('useModerationProperties', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchModerationProperties.mockResolvedValue({ properties: [property], total: 1 })
    mocks.fetchStatusCounts.mockResolvedValue(counts)
    mocks.updateModerationPropertyStatus.mockResolvedValue(undefined)
    mocks.requestAiReevaluation.mockResolvedValue(undefined)
    mocks.waitForModerationResult.mockResolvedValue({
      status: 'ai_approved',
      moderation_message: 'La publicación cumple las reglas.',
    })
  })

  it('updates the reevaluated card automatically when AI moderation finishes', async () => {
    const { result } = renderHook(() => useModerationProperties())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.reevaluate(property)
    })

    expect(mocks.waitForModerationResult).toHaveBeenCalledWith(property.id)
    expect(result.current.properties[0]).toMatchObject({
      status: 'ai_approved',
      moderation_message: 'La publicación cumple las reglas.',
    })
    expect(result.current.notice).toBe('La reevaluación terminó y la tarjeta se actualizó.')
    expect(result.current.actionLoading).toBeNull()
  })
})
