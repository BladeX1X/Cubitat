import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AccountPage } from './AccountPage'
import { supabase } from '../../shared/lib/supabaseClient'

const lazyPhaseTwoWait = { timeout: 5_000 }

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
      if (table === 'agent_applications') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              }),
            }),
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

    expect(await screen.findByText(/Guarda filtros importantes y consulta o elimina aquí tus alertas activas/i)).toBeInTheDocument()
    expect(screen.queryByText(/entorno DEV/i)).not.toBeInTheDocument()

    const agentButton = await screen.findByRole(
      'button',
      { name: /Agente \/ Inmobiliaria/i },
      lazyPhaseTwoWait,
    )
    expect(agentButton).toBeInTheDocument()

    await waitFor(() => {
      expect(agentButton).not.toBeDisabled()
    }, lazyPhaseTwoWait)

    fireEvent.click(agentButton)

    await waitFor(() => {
      expect(screen.getByText('Tipo de cuenta actualizado correctamente.')).toBeInTheDocument()
    }, lazyPhaseTwoWait)

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
    }, lazyPhaseTwoWait)

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
    async (userRole) => {
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

    await waitFor(() => {
      expect(fromSpy.mock.calls.filter(([table]) => table === 'profiles')).toHaveLength(2)
      expect(screen.queryByText('Tipo de Cuenta / Modalidad de Anuncio')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Agente \/ Inmobiliaria/i })).not.toBeInTheDocument()
    }, lazyPhaseTwoWait)
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
    }, lazyPhaseTwoWait)
    fromSpy.mockRestore()
  })

  it('permite editar el numero de celular sin requerir verificacion por WhatsApp', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const updateProfile = vi.fn().mockReturnValue({ eq: updateEq })
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: (columns: string) => ({
            eq: () => columns === 'role, verification_status'
              ? {
                  maybeSingle: () => Promise.resolve({
                    data: { role: 'buyer', verification_status: 'unverified' },
                    error: null,
                  }),
                  single: () => Promise.resolve({
                    data: { role: 'buyer', verification_status: 'unverified' },
                    error: null,
                  }),
                }
              : {
                  maybeSingle: () => Promise.resolve({
                    data: { role: 'buyer', full_name: 'Usuario Test', phone: '', avatar_url: '' },
                    error: null,
                  }),
                },
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
      />
    )

    expect(await screen.findByText('Ingresa tu numero de celular')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /verificar por whatsapp/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /mostrar mi whatsapp en mi perfil público/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Modificar' }).at(-1)!)
    const phoneInput = screen.getByPlaceholderText('Ej: +52 55 1234 5678')
    expect(phoneInput).toHaveAttribute('type', 'tel')
    expect(phoneInput).toHaveAttribute('inputmode', 'tel')

    fireEvent.change(phoneInput, {
      target: { value: '123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ingresa un telefono valido de 7 a 15 digitos.')).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()

    fireEvent.change(phoneInput, {
      target: { value: '+52 55 1234 5678' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ phone: '+525512345678' })
      expect(updateEq).toHaveBeenCalledWith('id', mockUser.id)
      expect(screen.getByText('Numero de celular actualizado.')).toBeInTheDocument()
    })
    expect(screen.getByText('+525512345678')).toBeInTheDocument()

    fromSpy.mockRestore()
  })

  it('requiere consentimiento explícito para mostrar el WhatsApp del agente en su perfil público', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const updateProfile = vi.fn().mockReturnValue({ eq: updateEq })
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  role: 'agent',
                  full_name: 'Agente QA',
                  phone: '+5355551234',
                  avatar_url: '',
                  public_whatsapp_enabled: false,
                },
                error: null,
              }),
            }),
          }),
          update: updateProfile,
        } as any
      }
      if (table === 'search_alerts') {
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any
      }
      return {} as any
    })

    render(
      <AccountPage
        user={mockUser}
        userRole="agent"
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
      />
    )

    const consent = await screen.findByRole('checkbox', { name: /mostrar mi whatsapp en mi perfil público/i })
    expect(consent).not.toBeChecked()

    fireEvent.click(consent)
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ public_whatsapp_enabled: true })
      expect(updateEq).toHaveBeenCalledWith('id', mockUser.id)
      expect(screen.getByText('Tu WhatsApp aparecerá en tu perfil público.')).toBeInTheDocument()
    })

    fireEvent.click(consent)
    await waitFor(() => {
      expect(updateProfile).toHaveBeenLastCalledWith({ public_whatsapp_enabled: false })
      expect(consent).not.toBeChecked()
      expect(screen.getByText('Tu WhatsApp dejó de aparecer en tu perfil público.')).toBeInTheDocument()
    })

    fireEvent.click(consent)
    await waitFor(() => expect(updateProfile).toHaveBeenLastCalledWith({ public_whatsapp_enabled: true }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Modificar' }).at(-1)!)
    fireEvent.change(screen.getByPlaceholderText('Ej: +52 55 1234 5678'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenLastCalledWith({ phone: null, public_whatsapp_enabled: false })
      expect(consent).not.toBeChecked()
      expect(screen.getByText('Numero de celular eliminado.')).toBeInTheDocument()
    })

    fromSpy.mockRestore()
  })

  it('descarta una respuesta tardia y limpia los datos al cambiar de sesion', async () => {
    let resolveFirstProfile: ((value: unknown) => void) | undefined
    const firstProfile = new Promise((resolve) => {
      resolveFirstProfile = resolve
    })
    const secondUser = {
      ...mockUser,
      id: 'f3000000-0000-0000-0000-000000000002',
      email: 'segundo@cubitat.cu',
      user_metadata: { full_name: 'Usuario Segundo' },
    }

    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: (columns: string) => ({
            eq: (_column: string, id: string) => ({
              maybeSingle: () => {
                if (columns.includes('avatar_url')) {
                  if (id === mockUser.id) return firstProfile
                  return Promise.resolve({
                    data: {
                      role: 'buyer',
                      full_name: 'Usuario Segundo',
                      phone: '+5355550002',
                      avatar_url: '',
                    },
                    error: null,
                  })
                }
                return Promise.resolve({
                  data: { role: 'buyer', verification_status: 'unverified' },
                  error: null,
                })
              },
            }),
          }),
        } as any
      }
      if (table === 'search_alerts') {
        return {
          select: () => ({
            eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
          }),
        } as any
      }
      return {} as any
    })

    const props = {
      userRole: 'buyer',
      onBack: vi.fn(),
      onNavigateAccount: vi.fn(),
      onNavigateFavorites: vi.fn(),
      onNavigateMyProperties: vi.fn(),
    }
    const { rerender } = render(<AccountPage {...props} user={mockUser} />)

    rerender(<AccountPage {...props} user={secondUser as any} />)
    expect(await screen.findByText('+5355550002')).toBeInTheDocument()

    resolveFirstProfile?.({
      data: {
        role: 'agent',
        full_name: 'Usuario Anterior',
        phone: '+5355550001',
        avatar_url: 'https://example.test/anterior.webp',
      },
      error: null,
    })

    await waitFor(() => {
      expect(screen.queryByText('Usuario Anterior')).not.toBeInTheDocument()
      expect(screen.queryByText('+5355550001')).not.toBeInTheDocument()
      expect(screen.getByText('Usuario Segundo')).toBeInTheDocument()
    })
    fromSpy.mockRestore()
  })
})

describe('AccountPage agent application shortcut', () => {
  it('shows the latest application status instead of inviting an applicant to apply again', async () => {
    const applicationStatusQuery = {
      eq: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve({ data: { status: 'reviewing' }, error: null }),
          }),
        }),
      }),
    }
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { role: 'admin', full_name: 'Usuario Test', phone: '', avatar_url: '' },
                error: null,
              }),
            }),
          }),
        } as any
      }
      if (table === 'agent_applications') {
        return { select: () => ({ ...applicationStatusQuery }) } as any
      }
      if (table === 'search_alerts') {
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any
      }
      return {} as any
    })

    render(
      <AccountPage
        user={mockUser}
        userRole="admin"
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onNavigateAgentApplication={vi.fn()}
      />,
    )

    expect(await screen.findByText('Postulación en revisión')).toBeInTheDocument()
    expect(screen.getByText('El equipo está revisando tu solicitud.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ser agente' })).not.toBeInTheDocument()
    fromSpy.mockRestore()
  })

  it('keeps account contact details within the mobile content width', async () => {
    const longEmail = 'agente.pruebas.responsive@example.test'
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { role: 'buyer', full_name: 'Usuario Test', phone: '', avatar_url: '' },
                error: null,
              }),
            }),
          }),
        } as any
      }
      if (table === 'search_alerts') {
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any
      }
      return {} as any
    })

    render(
      <AccountPage
        user={{ ...mockUser, email: longEmail }}
        userRole="buyer"
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
      />,
    )

    const emails = await screen.findAllByText(longEmail)
    expect(emails).toHaveLength(2)
    expect(emails[0].closest('main')?.querySelector('section.grid')).toHaveClass('min-w-0', 'grid-cols-1')
    for (const email of emails) {
      expect(email).toHaveClass('break-all')
      expect(email.closest('section')).toHaveClass('min-w-0')
    }
    fromSpy.mockRestore()
  })

  it('shows a Ser agente action in the account profile when Phase 3 is enabled', async () => {
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { role: 'buyer', full_name: 'Usuario Test', phone: '', avatar_url: '' },
                error: null,
              }),
              single: () => Promise.resolve({
                data: { role: 'buyer', verification_status: 'unverified' },
                error: null,
              }),
            }),
          }),
        } as any
      }
      if (table === 'agent_applications') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              }),
            }),
          }),
        } as any
      }
      if (table === 'search_alerts') {
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) } as any
      }
      return {} as any
    })
    const navigateAgentApplication = vi.fn()

    render(
      <AccountPage
        user={mockUser}
        userRole="buyer"
        onBack={vi.fn()}
        onNavigateAccount={vi.fn()}
        onNavigateFavorites={vi.fn()}
        onNavigateMyProperties={vi.fn()}
        onNavigateAgentApplication={navigateAgentApplication}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Ser agente' }))
    expect(navigateAgentApplication).toHaveBeenCalledOnce()
    fromSpy.mockRestore()
  })
})
