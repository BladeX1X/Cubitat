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

  it('actualiza el perfil existente sin upsert ni duplicar el rol en Auth metadata', async () => {
    const updateSingle = vi.fn().mockResolvedValue({ data: { role: 'agent' }, error: null })
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect })
    const updateProfile = vi.fn().mockReturnValue({ eq: updateEq })
    const upsertProfile = vi.fn()
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: (columns: string) => ({
            eq: () => columns === 'role, verification_status'
              ? {
                  single: () => Promise.resolve({
                    data: { role: 'buyer', verification_status: 'verified' },
                    error: null,
                  })
                }
              : {
                  maybeSingle: () => Promise.resolve({
                    data: { role: 'buyer', full_name: 'Usuario Test', verification_status: 'verified' },
                    error: null,
                  })
                }
          }),
          update: updateProfile,
          upsert: upsertProfile,
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
    const updateAuthUser = vi.spyOn(supabase.auth, 'updateUser')

    render(
      <AccountPage
        user={mockUser}
        userRole="buyer"
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onNavigateAgentDashboard={vi.fn()}
      />
    )

    const agentButton = screen.getByRole('button', { name: /Agente \/ Inmobiliaria/i })
    expect(agentButton).toBeInTheDocument()

    await waitFor(() => {
      expect(agentButton).not.toBeDisabled()
    })

    fireEvent.click(agentButton)

    await waitFor(() => {
      expect(screen.getByText('Tipo de cuenta actualizado correctamente.')).toBeInTheDocument()
    })

    expect(updateProfile).toHaveBeenCalledWith({ role: 'agent' })
    expect(updateEq).toHaveBeenCalledWith('id', mockUser.id)
    expect(updateSelect).toHaveBeenCalledWith('role')
    expect(updateSingle).toHaveBeenCalled()
    expect(upsertProfile).not.toHaveBeenCalled()
    expect(updateAuthUser).not.toHaveBeenCalled()

    fromSpy.mockRestore()
    updateAuthUser.mockRestore()
  })

  it('bloquea el cambio de buyer a agent mientras el KYC no esté aprobado', async () => {
    const updateProfile = vi.fn()
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: (columns: string) => ({
            eq: () => columns === 'role, verification_status'
              ? {
                  single: () => Promise.resolve({
                    data: { role: 'buyer', verification_status: 'unverified' },
                    error: null,
                  })
                }
              : {
                  maybeSingle: () => Promise.resolve({
                    data: { role: 'buyer', full_name: 'Usuario Test', verification_status: 'unverified' },
                    error: null,
                  })
                }
          }),
          update: updateProfile,
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
        onNavigateAgentDashboard={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Requiere verificación de identidad (KYC) aprobada.')).toBeInTheDocument()
    })

    const agentButton = screen.getByRole('button', { name: /Agente \/ Inmobiliaria/i })
    expect(agentButton).toBeDisabled()
    expect(screen.queryByText('Panel de Agente & Métricas')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir Panel de Agente →' })).not.toBeInTheDocument()
    fireEvent.click(agentButton)
    expect(updateProfile).not.toHaveBeenCalled()
    fromSpy.mockRestore()
  })

  it.each(['admin', 'seller', 'future-role', undefined] as const)(
    'no muestra el selector para un rol no elegible: %s',
    (userRole) => {
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { role: 'admin', full_name: 'Usuario Test' }, error: null })
            })
          }),
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
        userRole={userRole}
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
      />
    )

    expect(screen.queryByText('Tipo de Cuenta / Modalidad de Anuncio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agente \/ Inmobiliaria/i })).not.toBeInTheDocument()
    fromSpy.mockRestore()
  })

  it('muestra el selector cuando el rol buyer se resuelve después del montaje', async () => {
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { role: 'buyer', full_name: 'Usuario Test', verification_status: 'unverified' },
                error: null,
              })
            })
          }),
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
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Tipo de Cuenta / Modalidad de Anuncio')).toBeInTheDocument()
      expect(screen.getByText('Requiere verificación de identidad (KYC) aprobada.')).toBeInTheDocument()
    })
    fromSpy.mockRestore()
  })
})
