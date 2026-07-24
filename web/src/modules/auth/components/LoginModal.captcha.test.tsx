import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginModal } from './LoginModal'

const {
  requestPasswordResetWithCaptchaMock,
  signUpWithCaptchaMock,
} = vi.hoisted(() => ({
  requestPasswordResetWithCaptchaMock: vi.fn(),
  signUpWithCaptchaMock: vi.fn(),
}))

vi.mock('../captchaAuth', () => ({
  requestPasswordResetWithCaptcha: requestPasswordResetWithCaptchaMock,
  signUpWithCaptcha: signUpWithCaptchaMock,
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}))

vi.mock('../../../shared/ui/TurnstileWidget', () => ({
  TurnstileWidget: ({
    action,
    onVerify,
  }: {
    action: string
    onVerify: (token: string) => void
  }) => (
    <button
      type="button"
      data-testid={`turnstile-${action}`}
      onClick={() => onVerify(`token-${action}`)}
    >
      Completar Turnstile
    </button>
  ),
}))

describe('LoginModal CAPTCHA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  it('sends the widget token through the protected sign-up adapter', async () => {
    signUpWithCaptchaMock.mockResolvedValueOnce({
      data: { user: { identities: [{}] } },
      error: null,
    })
    render(<LoginModal />)

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta gratis' }))
    fireEvent.change(screen.getByPlaceholderText('Juan Perez'), { target: { value: 'QA Auth' } })
    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), { target: { value: 'QA@Example.com' } })
    const passwordFields = screen.getAllByPlaceholderText('********')
    fireEvent.change(passwordFields[0], { target: { value: 'Secure1!' } })
    fireEvent.change(passwordFields[1], { target: { value: 'Secure1!' } })
    fireEvent.click(screen.getByTestId('turnstile-register-user'))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    await waitFor(() => {
      expect(signUpWithCaptchaMock).toHaveBeenCalledWith(expect.objectContaining({
        captchaToken: 'token-register-user',
        email: 'qa@example.com',
      }))
    })
  })

  it('sends the widget token through the protected recovery adapter', async () => {
    requestPasswordResetWithCaptchaMock.mockResolvedValueOnce({ data: {}, error: null })
    render(<LoginModal />)

    fireEvent.click(screen.getByRole('button', { name: 'Olvide mi contrasena' }))
    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), { target: { value: 'QA@Example.com' } })
    fireEvent.click(screen.getByTestId('turnstile-forgot-password'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    await waitFor(() => {
      expect(requestPasswordResetWithCaptchaMock).toHaveBeenCalledWith(expect.objectContaining({
        captchaToken: 'token-forgot-password',
        email: 'qa@example.com',
      }))
    })
  })
})
