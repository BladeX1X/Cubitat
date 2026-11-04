import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginModal } from './LoginModal'

const {
  requestPasswordResetWithCaptchaMock,
  signInWithPasswordMock,
  signUpWithCaptchaMock,
} = vi.hoisted(() => ({
  requestPasswordResetWithCaptchaMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
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
      signInWithPassword: signInWithPasswordMock,
    },
  },
}))

vi.mock('../../../shared/ui/TurnstileWidget', () => ({
  TurnstileWidget: ({
    action,
    onVerify,
    onError,
  }: {
    action: string
    onVerify: (token: string) => void
    onError?: (errorCode?: string) => void
  }) => (
    <>
      <button
        type="button"
        data-testid={`turnstile-${action}`}
        onClick={() => onVerify(`token-${action}`)}
      >
        Completar Turnstile
      </button>
      <button type="button" data-testid={`turnstile-error-${action}`} onClick={() => onError?.('SCRIPT_LOAD_ERROR')}>
        Simular error de carga
      </button>
    </>
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

  it('sends the widget token with password login', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: null })
    render(<LoginModal />)

    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), { target: { value: 'QA@Example.com' } })
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'Secure1!' } })
    fireEvent.click(screen.getByTestId('turnstile-login-password'))
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesion' }))

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: 'qa@example.com',
        password: 'Secure1!',
        options: {
          captchaToken: 'token-login-password',
        },
      })
    })
  })

  it('blocks password login until Turnstile is completed', async () => {
    render(<LoginModal />)

    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), { target: { value: 'QA@Example.com' } })
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'Secure1!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesion' }))

    expect(await screen.findByText('Por favor, completa la verificación de seguridad.')).toBeInTheDocument()
    expect(signInWithPasswordMock).not.toHaveBeenCalled()
  })

  it('clears a stale widget-load warning after Turnstile completes successfully', async () => {
    render(<LoginModal />)

    fireEvent.click(screen.getByTestId('turnstile-error-login-password'))
    expect(await screen.findByText('No se pudo cargar la verificación de seguridad. Revisa tu conexión y vuelve a intentarlo.')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('turnstile-login-password'))
    await waitFor(() => {
      expect(screen.queryByText('No se pudo cargar la verificación de seguridad. Revisa tu conexión y vuelve a intentarlo.')).not.toBeInTheDocument()
    })
  })

  it('reports server-side CAPTCHA rejection accurately and clears it on a fresh challenge', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: { code: 'captcha_failed', message: 'captcha verification failed' } })
    render(<LoginModal />)

    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), { target: { value: 'QA@Example.com' } })
    fireEvent.change(screen.getByPlaceholderText('********'), { target: { value: 'Secure1!' } })
    fireEvent.click(screen.getByTestId('turnstile-login-password'))
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesion' }))

    const serverError = 'Supabase no pudo validar la verificación de seguridad. Completa un nuevo desafío e inténtalo otra vez.'
    expect(await screen.findByText(serverError)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('turnstile-login-password'))
    await waitFor(() => expect(screen.queryByText(serverError)).not.toBeInTheDocument())
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

  it('requires a fresh resend-action CAPTCHA and sends it with a generic confirmation request', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    signUpWithCaptchaMock.mockResolvedValueOnce({
      data: { user: { identities: [] } },
      error: null,
    })
    render(<LoginModal />)

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta gratis' }))
    fireEvent.change(screen.getByPlaceholderText('Juan Perez'), { target: { value: 'QA Auth' } })
    fireEvent.change(screen.getByPlaceholderText('tucorreo@ejemplo.com'), { target: { value: 'QA@example.com' } })
    const passwordFields = screen.getAllByPlaceholderText('********')
    fireEvent.change(passwordFields[0], { target: { value: 'Secure1!' } })
    fireEvent.change(passwordFields[1], { target: { value: 'Secure1!' } })
    fireEvent.click(screen.getByTestId('turnstile-register-user'))
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const resendButton = await screen.findByRole('button', { name: 'Reenviar enlace si falta confirmar' })
    expect(screen.getByTestId('turnstile-resend-confirmation')).toBeInTheDocument()
    fireEvent.click(resendButton)
    expect(await screen.findByText('Por favor, completa la verificación de seguridad.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('turnstile-resend-confirmation'))
    fireEvent.click(resendButton)
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/resend-confirmation', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'qa@example.com', turnstileToken: 'token-resend-confirmation' }),
      }))
    })
    expect(await screen.findByText('Si la solicitud puede procesarse, recibiras un correo con los pasos para continuar.')).toBeInTheDocument()
  })
})
