import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginModal } from './LoginModal'
import { SavePromptModal } from './SavePromptModal'
import {
  MAP_FULLSCREEN_LAYER_Z_INDEX,
  MODAL_LAYER_Z_INDEX,
} from '../../../shared/ui/layers'

const { signInWithOAuthMock } = vi.hoisted(() => ({
  signInWithOAuthMock: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: signInWithOAuthMock,
    },
  },
}))

vi.mock('../../../shared/ui/TurnstileWidget', () => ({
  TurnstileWidget: () => <div data-testid="turnstile-widget" />,
}))

vi.mock('../contexts/AuthModalContext', () => ({
  useAuthModal: () => ({ openLogin: vi.fn() }),
}))

describe('capas de autenticacion', () => {
  it('reserva una capa modal superior al mapa a pantalla completa', () => {
    expect(MODAL_LAYER_Z_INDEX).toBeGreaterThan(MAP_FULLSCREEN_LAYER_Z_INDEX)
  })

  it('monta la invitacion de favorito sobre el mapa y directamente en body', () => {
    render(<SavePromptModal onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Guardar propiedad' })
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog).toHaveStyle({ zIndex: String(MODAL_LAYER_Z_INDEX) })
  })

  it('mantiene el login sobre el mapa', () => {
    render(<LoginModal onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Inicio de sesion' })
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog).toHaveStyle({ zIndex: String(MODAL_LAYER_Z_INDEX) })
  })

  it('solicita a Google elegir la cuenta antes de autenticar', async () => {
    signInWithOAuthMock.mockResolvedValueOnce({ data: null, error: null })
    render(<LoginModal onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Google' }))

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          options: expect.objectContaining({
            queryParams: expect.objectContaining({
              prompt: 'select_account',
            }),
          }),
        }),
      )
    })
  })
})
