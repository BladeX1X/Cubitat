import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../../shared/lib/supabaseClient'
import type { SearchFilters } from '../types'
import { useSearchAlerts } from './useSearchAlerts'

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}))

const filters: SearchFilters = {
  query: 'Vedado',
  operations: ['venta'],
  propertyType: 'apartamento',
  zoneId: 'vedado',
  bedrooms: 2,
  bathrooms: 'all',
  parking: 'all',
  priceRange: '50000-100000',
}

const alert = {
  id: 'alert-1',
  user_id: 'user-1',
  label: 'Apartamentos en venta en Vedado (2+ hab., precio 50000-100000)',
  filters,
  query: 'Vedado',
  operation: 'venta',
  property_type: 'apartamento',
  price_range: '50000-100000',
  bedrooms: '2',
  bathrooms: null,
  parking: null,
  is_active: true,
  last_sent_at: null,
  created_at: '2026-09-27T00:00:00.000Z',
  updated_at: '2026-09-27T00:00:00.000Z',
}

function createQuery() {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.delete.mockReturnValue(query)
  return query
}

describe('useSearchAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    } as never)
  })

  it('loads alerts for the current user', async () => {
    const query = createQuery()
    query.order.mockResolvedValue({ data: [alert], error: null })
    vi.mocked(supabase.from).mockReturnValue(query as never)

    const { result } = renderHook(() => useSearchAlerts('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(result.current.alerts).toEqual([alert])
    expect(result.current.error).toBeNull()
  })

  it('reports a safe load error', async () => {
    const query = createQuery()
    query.order.mockResolvedValue({ data: null, error: { message: 'private details' } })
    vi.mocked(supabase.from).mockReturnValue(query as never)

    const { result } = renderHook(() => useSearchAlerts('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('No se pudieron cargar tus alertas.')
    expect(result.current.error).not.toContain('private details')
  })

  it('finishes loading when the alert query throws', async () => {
    const query = createQuery()
    query.order.mockRejectedValue(new Error('network failure'))
    vi.mocked(supabase.from).mockReturnValue(query as never)

    const { result } = renderHook(() => useSearchAlerts('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('No se pudieron cargar tus alertas.')
  })

  it('creates an alert and adds it to the list', async () => {
    const loadQuery = createQuery()
    loadQuery.order.mockResolvedValue({ data: [], error: null })
    const insertQuery = createQuery()
    insertQuery.single.mockResolvedValue({ data: alert, error: null })
    vi.mocked(supabase.from)
      .mockReturnValueOnce(loadQuery as never)
      .mockReturnValueOnce(insertQuery as never)

    const { result } = renderHook(() => useSearchAlerts('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let created
    await act(async () => {
      created = await result.current.createAlert(filters)
    })

    expect(created).toEqual(alert)
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      operation: 'venta',
      property_type: 'apartamento',
    }))
    expect(result.current.alerts).toEqual([alert])
    expect(result.current.creating).toBe(false)
  })

  it('clears the list for an unauthenticated user and refuses creation', async () => {
    const { result } = renderHook(() => useSearchAlerts(null))

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)
    await act(async () => {
      await expect(result.current.createAlert(filters)).rejects.toThrow('Unauthenticated search alert')
    })
    expect(result.current.error).toBe('Inicia sesion para guardar esta alerta.')
    expect(result.current.creating).toBe(false)
  })

  it('removes an alert locally after deletion', async () => {
    const loadQuery = createQuery()
    loadQuery.order.mockResolvedValue({ data: [alert], error: null })
    const deleteQuery = createQuery()
    deleteQuery.eq.mockResolvedValue({ error: null })
    vi.mocked(supabase.from)
      .mockReturnValueOnce(loadQuery as never)
      .mockReturnValueOnce(deleteQuery as never)

    const { result } = renderHook(() => useSearchAlerts('user-1'))
    await waitFor(() => expect(result.current.alerts).toEqual([alert]))

    await act(async () => {
      await result.current.deleteAlert('alert-1')
    })

    expect(result.current.alerts).toEqual([])
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'alert-1')
  })

  it('resets creating after an unexpected insert exception', async () => {
    const loadQuery = createQuery()
    loadQuery.order.mockResolvedValue({ data: [], error: null })
    const insertQuery = createQuery()
    insertQuery.single.mockRejectedValue(new Error('network failure'))
    vi.mocked(supabase.from)
      .mockReturnValueOnce(loadQuery as never)
      .mockReturnValueOnce(insertQuery as never)

    const { result } = renderHook(() => useSearchAlerts('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.createAlert(filters)).rejects.toThrow('network failure')
    })

    expect(result.current.creating).toBe(false)
    expect(result.current.error).toBe('No se pudo crear la alerta.')
  })
})
