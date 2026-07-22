import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AgentDashboardPage } from './AgentDashboardPage'
import { supabase } from '../../shared/lib/supabaseClient'

// Mock Supabase
vi.mock('../../shared/lib/supabaseClient', () => {
  const mockSingle = vi.fn().mockResolvedValue({ data: { role: 'agent' }, error: null })
  const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { role: 'agent' }, error: null })
  const mockOrder = vi.fn().mockResolvedValue({
    data: [
      {
        id: 'prop-1',
        title: 'Apartamento de Lujo en El Vedado',
        location: 'Vedado, La Habana',
        price_usd: 120000,
        cover_image: null,
        status: 'published',
        created_at: new Date().toISOString(),
        user_id: 'agent-123',
        view_count: 350,
      },
      {
        id: 'prop-2',
        title: 'Casa Colonial con Garaje',
        location: 'Playa, La Habana',
        price_usd: 85000,
        cover_image: null,
        status: 'published',
        created_at: new Date().toISOString(),
        user_id: 'agent-123',
        view_count: 150,
      },
      {
        id: 'prop-3',
        title: 'Terreno Urbanizable',
        location: 'Miramar, La Habana',
        price_usd: 45000,
        cover_image: null,
        status: 'paused',
        created_at: new Date().toISOString(),
        user_id: 'agent-123',
        view_count: 0,
      },
    ],
    error: null,
  })

  const mockEq = vi.fn().mockImplementation((_field: string, _val: any) => ({
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    order: mockOrder,
    update: mockUpdate,
  }))

  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })

  const mockSelect = vi.fn().mockImplementation((_cols: string) => ({
    eq: mockEq,
  }))

  const mockFrom = vi.fn().mockImplementation((_table: string) => ({
    select: mockSelect,
    update: mockUpdate,
  }))

  return {
    supabase: {
      from: mockFrom,
    },
  }
})

describe('AgentDashboardPage', () => {
  const mockUser = {
    id: 'agent-123',
    email: 'agente@cubitat.cu',
    app_metadata: {},
    user_metadata: { full_name: 'Carlos Agente' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders metric cards with correct values from fetched properties', async () => {
    render(<AgentDashboardPage user={mockUser} />)

    // Wait for properties to load
    await waitFor(() => {
      expect(screen.getByTestId('metric-active-properties')).toHaveTextContent('2')
    })

    // Total views: 350 + 150 + 0 = 500
    expect(screen.getByTestId('metric-total-views')).toHaveTextContent('500')

    // Estimated leads: 500 * 0.05 = 25
    expect(screen.getByTestId('metric-estimated-leads')).toHaveTextContent('25')

    // Check main titles
    expect(screen.getByText('Métricas y Rendimiento')).toBeInTheDocument()
    expect(screen.getByText('Publicaciones del Agente')).toBeInTheDocument()
  })

  it('renders properties in table and responds to search filtering', async () => {
    render(<AgentDashboardPage user={mockUser} />)

    await waitFor(() => {
      expect(screen.getByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    })

    expect(screen.getByText('Casa Colonial con Garaje')).toBeInTheDocument()
    expect(screen.getByText('Terreno Urbanizable')).toBeInTheDocument()

    // Type search query
    const searchInput = screen.getByPlaceholderText(/buscar por título o zona/i)
    fireEvent.change(searchInput, { target: { value: 'Vedado' } })

    expect(screen.getByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    expect(screen.queryByText('Casa Colonial con Garaje')).not.toBeInTheDocument()
    expect(screen.queryByText('Terreno Urbanizable')).not.toBeInTheDocument()
  })

  it('filters properties by status buttons (Activas / Pausadas)', async () => {
    render(<AgentDashboardPage user={mockUser} />)

    await waitFor(() => {
      expect(screen.getByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    })

    // Click Activas filter button
    const activeFilterBtn = screen.getByRole('button', { name: /activas \(2\)/i })
    fireEvent.click(activeFilterBtn)

    expect(screen.getByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    expect(screen.getByText('Casa Colonial con Garaje')).toBeInTheDocument()
    expect(screen.queryByText('Terreno Urbanizable')).not.toBeInTheDocument()

    // Click Pausadas filter button
    const pausedFilterBtn = screen.getByRole('button', { name: /pausadas \(1\)/i })
    fireEvent.click(pausedFilterBtn)

    expect(screen.queryByText('Apartamento de Lujo en El Vedado')).not.toBeInTheDocument()
    expect(screen.getByText('Terreno Urbanizable')).toBeInTheDocument()
  })

  it('triggers onEditProperty when clicking Editar button', async () => {
    const onEditPropertyMock = vi.fn()
    render(<AgentDashboardPage user={mockUser} onEditProperty={onEditPropertyMock} />)

    await waitFor(() => {
      expect(screen.getByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    fireEvent.click(editButtons[0])

    expect(onEditPropertyMock).toHaveBeenCalledWith('prop-1')
  })

  it('triggers onSelectProperty when clicking "Ver cómo otros lo ven" button', async () => {
    const onSelectPropertyMock = vi.fn()
    render(<AgentDashboardPage user={mockUser} onSelectProperty={onSelectPropertyMock} />)

    await waitFor(() => {
      expect(screen.getByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByRole('button', { name: /ver cómo otros lo ven/i })
    fireEvent.click(viewButtons[0])

    expect(onSelectPropertyMock).toHaveBeenCalledWith('prop-1')
  })

  it('calls update to pause/reactivate property when clicking Pausar/Reactivar button', async () => {
    render(<AgentDashboardPage user={mockUser} />)

    await waitFor(() => {
      expect(screen.getByText('Apartamento de Lujo en El Vedado')).toBeInTheDocument()
    })

    const pauseButtons = screen.getAllByRole('button', { name: /^pausar$/i })
    fireEvent.click(pauseButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('properties')
  })
})
