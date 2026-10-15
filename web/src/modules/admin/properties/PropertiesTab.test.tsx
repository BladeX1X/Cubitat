import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropertyModerationFilters } from '../core/types'
import { PropertiesTab } from './PropertiesTab'

const mocks = vi.hoisted(() => ({ useModerationProperties: vi.fn() }))

vi.mock('./useModerationProperties', () => ({ useModerationProperties: mocks.useModerationProperties }))

const defaultFilters: PropertyModerationFilters = {
  query: '', operation: 'all', propertyType: 'all', createdAfter: '', createdBefore: '',
}
let hookState: Record<string, unknown>

describe('PropertiesTab filters', () => {
  afterEach(() => vi.useRealTimers())

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

  it('applies a selected operation immediately', async () => {
    render(<PropertiesTab />)

    fireEvent.click(screen.getByRole('button', { name: 'Filtrar por operación' }))
    fireEvent.click(screen.getByRole('option', { name: 'Alquiler' }))

    await waitFor(() => expect(hookState.updateDraftFilters).toHaveBeenCalledWith({ operation: 'alquiler' }))
    expect(hookState.applyFilters).toHaveBeenCalledWith({ ...defaultFilters, operation: 'alquiler' })
  })

  it('applies a selected date immediately', () => {
    render(<PropertiesTab />)

    fireEvent.change(screen.getByLabelText('Fecha inicial'), { target: { value: '2026-10-01' } })

    expect(hookState.updateDraftFilters).toHaveBeenCalledWith({ createdAfter: '2026-10-01' })
    expect(hookState.applyFilters).toHaveBeenCalledWith({ ...defaultFilters, createdAfter: '2026-10-01' })
  })

  it('does not auto-apply a search while the date range is invalid', () => {
    vi.useFakeTimers()
    hookState.draftFilters = { ...defaultFilters, createdAfter: '2026-10-10', createdBefore: '2026-10-01' }
    const view = render(<PropertiesTab />)

    fireEvent.change(screen.getByPlaceholderText('Ej. casa en Holguín'), { target: { value: 'Holguín' } })
    hookState.draftFilters = { ...hookState.draftFilters as PropertyModerationFilters, query: 'Holguín' }
    view.rerender(<PropertiesTab />)
    act(() => vi.advanceTimersByTime(400))

    expect(screen.getByRole('alert')).toHaveTextContent('La fecha inicial debe ser anterior o igual a la fecha final.')
    expect(hookState.applyFilters).not.toHaveBeenCalled()
  })

  it('debounces free-text search and explains automatic application', () => {
    vi.useFakeTimers()
    const view = render(<PropertiesTab />)

    fireEvent.change(screen.getByPlaceholderText('Ej. casa en Holguín'), { target: { value: 'El Vedado' } })
    hookState.draftFilters = { ...defaultFilters, query: 'El Vedado' }
    view.rerender(<PropertiesTab />)
    expect(hookState.applyFilters).not.toHaveBeenCalled()
    expect(screen.getByText(/se aplican automáticamente/i)).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(400))
    expect(hookState.applyFilters).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
