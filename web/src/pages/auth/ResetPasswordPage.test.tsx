import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'

const {
  cleanAuthUrlMock,
  getAdminMfaStatusMock,
  getAuthUrlParamsMock,
  getSessionMock,
  onAuthStateChangeMock,
  signOutMock,
  updateUserMock,
  verifyOtpMock,
} = vi.hoisted(() => ({
  cleanAuthUrlMock: vi.fn(),
  getAdminMfaStatusMock: vi.fn(),
  getAuthUrlParamsMock: vi.fn(),
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  updateUserMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
      updateUser: updateUserMock,
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  },
  supabaseRecovery: {
    auth: {
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

vi.mock('./authUrlParams', async () => {
  const actual = await vi.importActual<typeof import('./authUrlParams')>('./authUrlParams')
  return {
    ...actual,
    cleanAuthUrl: cleanAuthUrlMock,
    getAuthUrlParams: getAuthUrlParamsMock,
  }
})

vi.mock('../../modules/auth/mfa/mfaService', async () => {
  const actual = await vi.importActual<typeof import('../../modules/auth/mfa/mfaService')>(
    '../../modules/auth/mfa/mfaService',
  )
  return {
    ...actual,
    getAdminMfaStatus: getAdminMfaStatusMock,
    verifyTotp: verifyOtpMock,
  }
})

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthUrlParamsMock.mockReturnValue({
      accessToken: null,
      code: null,
      error: null,
      refreshToken: null,
      tokenHash: 'recovery-token',
      type: 'recovery',
    })
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    })
    getAdminMfaStatusMock.mockResolvedValue({
      currentLevel: 'aal1',
      verifiedFactorId: null,
      unverifiedFactorIds: [],
    })
    updateUserMock.mockResolvedValue({ data: {}, error: null })
    signOutMock.mockResolvedValue({ error: null })
    verifyOtpMock.mockResolvedValue(undefined)
  })

  it('updates the password directly when the recovery session does not require MFA', async () => {
    render(<ResetPasswordPage onDone={vi.fn()} />)

    await screen.findByRole('button', { name: /guardar nueva contrasena/i })
    const passwordInputs = screen.getAllByPlaceholderText('********')
    fireEvent.change(passwordInputs[0], {
      target: { value: 'NuevaClave1!' },
    })
    fireEvent.change(passwordInputs[1], {
      target: { value: 'NuevaClave1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /guardar nueva contrasena/i }))

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ password: 'NuevaClave1!' }))
    expect(verifyOtpMock).not.toHaveBeenCalled()
    expect(signOutMock).toHaveBeenCalledOnce()
  })

  it('rejects a recovery marker without credentials even when a session exists', async () => {
    getAuthUrlParamsMock.mockReturnValue({
      accessToken: null,
      code: null,
      error: null,
      refreshToken: null,
      tokenHash: null,
      type: 'recovery',
    })

    render(<ResetPasswordPage onDone={vi.fn()} />)

    expect(await screen.findByText(/abre el enlace completo desde el correo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /guardar nueva contrasena/i })).toBeDisabled()
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('hides technical PKCE errors and tells the user to request a fresh link', async () => {
    getAuthUrlParamsMock.mockReturnValue({
      accessToken: null,
      code: null,
      error: 'PKCE code verifier not found in storage.',
      refreshToken: null,
      tokenHash: null,
      type: 'recovery',
    })

    render(<ResetPasswordPage onDone={vi.fn()} />)

    expect(await screen.findByText(/solicita uno nuevo/i)).toBeInTheDocument()
    expect(screen.queryByText(/PKCE code verifier/i)).toBeNull()
  })

  it('asks for the TOTP code before changing password when the recovery session needs AAL2', async () => {
    getAdminMfaStatusMock.mockResolvedValue({
      currentLevel: 'aal1',
      verifiedFactorId: 'factor-1',
      unverifiedFactorIds: [],
    })

    render(<ResetPasswordPage onDone={vi.fn()} />)

    expect(await screen.findByText(/segundo factor activo/i)).toBeInTheDocument()
    const passwordInputs = screen.getAllByPlaceholderText('********')
    fireEvent.change(passwordInputs[0], {
      target: { value: 'NuevaClave1!' },
    })
    fireEvent.change(passwordInputs[1], {
      target: { value: 'NuevaClave1!' },
    })
    fireEvent.change(screen.getByLabelText(/codigo de verificacion/i), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: /guardar nueva contrasena/i }))

    await waitFor(() => expect(verifyOtpMock).toHaveBeenCalledWith('factor-1', '123456'))
    expect(updateUserMock).toHaveBeenCalledWith({ password: 'NuevaClave1!' })
  })

  it('keeps raw AAL2 provider errors out of the UI', async () => {
    updateUserMock.mockResolvedValue({
      data: null,
      error: new Error('AAL2 session is required to update email or password when MFA is enabled.'),
    })

    render(<ResetPasswordPage onDone={vi.fn()} />)

    await screen.findByRole('button', { name: /guardar nueva contrasena/i })
    const passwordInputs = screen.getAllByPlaceholderText('********')
    fireEvent.change(passwordInputs[0], {
      target: { value: 'NuevaClave1!' },
    })
    fireEvent.change(passwordInputs[1], {
      target: { value: 'NuevaClave1!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /guardar nueva contrasena/i }))

    expect(await screen.findByText(/verifica el segundo factor/i)).toBeInTheDocument()
    expect(screen.queryByText(/AAL2 session is required/i)).toBeNull()
  })
})
