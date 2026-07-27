import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountPage } from './AccountPage'
import { supabase } from '../../shared/lib/supabaseClient'

const mockUser = {
  id: 'f3000000-0000-0000-0000-000000000001',
  email: 'test@cubitat.cu',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  user_metadata: {
    full_name: 'Usuario Test',
  },
} as any

describe('AccountPage - Role Selector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('permite seleccionar el rol Agente / Inmobiliaria y guardar en Supabase con enum agent', async () => {
    const upsertSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { role: 'buyer', full_name: 'Usuario Test' }, error: null })
            })
          }),
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any
      }
      if (table === 'search_alerts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null })
            })
          })
        } as any
      }
      return {} as any
    })

    render(
      <AccountPage
        user={mockUser}
        userRole="buyer"
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
      />
    )

    const agentButton = screen.getByRole('button', { name: /Agente \/ Inmobiliaria/i })
    expect(agentButton).toBeInTheDocument()

    fireEvent.click(agentButton)

    await waitFor(() => {
      expect(screen.getByText('Tipo de cuenta actualizado correctamente.')).toBeInTheDocument()
    })

    upsertSpy.mockRestore()
  })
})
