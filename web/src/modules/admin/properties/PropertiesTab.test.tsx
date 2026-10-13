import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyModerationFilters } from '../core/types'
import { PropertiesTab } from './PropertiesTab'

const mocks = vi.hoisted(() => ({ useModerationProperties: vi.fn() }))

vi.mock('./useModerationProperties', () => ({ useModerationProperties: mocks.useModerationProperties }))

const defaultFilters: PropertyModerationFilters = {
  query: '', operation: 'all', propertyType: 'all', createdAfter: '', createdBefore: '',
}
let hookState: Record<string, unknown>

describe('PropertiesTab filters', () => {
  beforeEach(() => {
    hookState = {
      properties: [],
      statusFilter: 'published',
      statusCounts: {
        pending_review: 0, ai_approved: 0, ai_rejected: 0, published: 1000,
        paused: 0, owner_hidden: 0, all: 1000, image_duplicates: 0,
      },
      page: 0,
      total: 1000,
      loading: false,
      error: null,
      actionLoading: null,
      notice: null,
      filters: defaultFilters,
      draftFilters: defaultFilters,
      updateDraftFilters: vi.fn(),
      applyFilters: vi.fn(),
      clearFilters: vi.fn(),
      setStatusFilter: vi.fn(),
      load: vi.fn(),
      changeStatus: vi.fn(),
      hide: vi.fn(),
      restore: vi.fn(),
      remove: vi.fn(),
      reevaluate: vi.fn(),
      clearNotice: vi.fn(),
    }
    mocks.useModerationProperties.mockReturnValue(hookState)
  })

  it('shows server result totals and provides searchable, filterable criteria', () => {
    render(<PropertiesTab />)

    expect(screen.getByText('1–15')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ej. casa en Holguín')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filtrar por operación' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filtrar por tipo de inmueble' })).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha inicial')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha final')).toBeInTheDocument()
  })

  it('applies entered criteria only after the moderator submits the filter form', () => {
    render(<PropertiesTab />)

    fireEvent.change(screen.getByPlaceholderText('Ej. casa en Holguín'), { target: { value: 'El Vedado' } })
    fireEvent.click(screen.getByRole('button', { name: /Aplicar filtros/ }))

    expect(hookState.updateDraftFilters).toHaveBeenCalledWith({ query: 'El Vedado' })
    expect(hookState.applyFilters).toHaveBeenCalledOnce()
  })
})
