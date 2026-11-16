import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LoginModal } from './LoginModal'
import { getAuthErrorMessage } from '../authErrorMessages'
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

  it('monta la invitacion genérica de favoritos sobre el mapa y directamente en body', () => {
    render(<SavePromptModal onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Guardar favorito' })
    expect(dialog.parentElement).toBe(document.body)
    expect(dialog).toHaveStyle({ zIndex: String(MODAL_LAYER_Z_INDEX) })
    expect(screen.getByRole('heading', { name: 'Inicia sesión para guardar tus favoritos' })).toBeInTheDocument()
    expect(screen.getByText('Así podrás consultarlos en cualquier dispositivo.')).toBeInTheDocument()
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

  it('oculta el detalle técnico si Google no tiene secreto OAuth configurado', async () => {
    signInWithOAuthMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Unsupported provider: missing OAuth secret' },
    })
    render(<LoginModal onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Google' }))

    expect(await screen.findByText(/El inicio con Google no está disponible temporalmente/i)).toBeInTheDocument()
    expect(screen.queryByText(/Unsupported provider/i)).not.toBeInTheDocument()
  })

  it('oculta el detalle técnico cuando falta la configuración de CAPTCHA', () => {
    const message = getAuthErrorMessage(
      { message: 'Captcha verification failed: missing secret' },
      'fallback',
    )

    expect(message).toMatch(/Supabase no pudo validar la verificación de seguridad/i)
    expect(message).not.toMatch(/missing secret/i)
  })
})
