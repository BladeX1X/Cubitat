import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminMfaGate } from './AdminMfaGate'

const { getAal, listFactors, enroll, unenroll, challengeAndVerify, rpc } = vi.hoisted(() => ({
  getAal: vi.fn(),
  listFactors: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challengeAndVerify: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    rpc,
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: getAal,
        listFactors,
        enroll,
        unenroll,
        challengeAndVerify,
      },
    },
  },
}))

describe('AdminMfaGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ data: null, error: null })
    getAal.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
    listFactors.mockResolvedValue({ data: { all: [], totp: [] }, error: null })
  })

  it('renderiza el panel únicamente cuando la sesión está en aal2', async () => {
    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)

    expect(await screen.findByText('Contenido administrativo')).toBeInTheDocument()
  })

  it('permite temporalmente al administrador mientras el vencimiento de base sigue vigente', async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString()
    rpc.mockResolvedValue({ data: expiresAt, error: null })
    getAal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)

    expect(await screen.findByText('Contenido administrativo')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/segundo factor no se exige temporalmente/i)
    expect(getAal).not.toHaveBeenCalled()
    expect(enroll).not.toHaveBeenCalled()
  })

  it('vuelve a bloquear la sesión cuando vence el periodo aunque el panel siga abierto', async () => {
    vi.useFakeTimers()
    const startedAt = new Date('2026-10-13T00:00:00.000Z')
    vi.setSystemTime(startedAt)
    rpc.mockResolvedValue({ data: new Date(startedAt.getTime() + 1000).toISOString(), error: null })
    getAal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(screen.getByText('Contenido administrativo')).toBeInTheDocument()

    await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); await Promise.resolve() })
    expect(screen.getByLabelText(/código de 6 dígitos/i)).toBeInTheDocument()
    expect(screen.queryByText('Contenido administrativo')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('pide el código sin mostrar el panel cuando ya existe un factor verificado', async () => {
    getAal.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)

    expect(await screen.findByRole('heading', { name: /verificación administrativa/i })).toBeInTheDocument()
    expect(screen.queryByText('Contenido administrativo')).not.toBeInTheDocument()
  })

  it('eleva la sesión con un código TOTP válido', async () => {
    getAal
      .mockResolvedValueOnce({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null })
      .mockResolvedValueOnce({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })
    challengeAndVerify.mockResolvedValue({ data: {}, error: null })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)
    const input = await screen.findByLabelText(/código de 6 dígitos/i)
    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verificar y entrar/i }))

    await waitFor(() => expect(challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      code: '123456',
    }))
    expect(await screen.findByText('Contenido administrativo')).toBeInTheDocument()
  })

  it('explica que la sesión expiró cuando Supabase ya no reconoce la sesión MFA', async () => {
    const onSessionExpired = vi.fn().mockResolvedValue(undefined)
    getAal.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })
    challengeAndVerify.mockResolvedValue({
      data: null,
      error: { code: 'session_not_found', message: 'Session not found', status: 403 },
    })

    render(
      <AdminMfaGate onSessionExpired={onSessionExpired}>
        <div>Contenido administrativo</div>
      </AdminMfaGate>,
    )
    fireEvent.change(await screen.findByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verificar y entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu sesión expiró. Inicia sesión nuevamente para verificar el segundo factor.',
    )
    expect(screen.getByText(/la verificación anterior ya no puede continuar/i)).toBeInTheDocument()
    expect(screen.queryByText(/escribe el código actual de tu app autenticadora/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/código de 6 dígitos/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión e iniciar nuevamente/i }))
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledOnce())
  })

  it('mantiene el mensaje específico cuando el código TOTP es inválido', async () => {
    getAal.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })
    challengeAndVerify.mockResolvedValue({
      data: null,
      error: { code: 'mfa_verification_failed', message: 'Invalid TOTP code', status: 422 },
    })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)
    fireEvent.change(await screen.findByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verificar y entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El código no es válido o expiró. Usa el código actual e intenta de nuevo.',
    )
  })

  it('mantiene el guard bloqueado y permite reintentar si falla el cierre de la sesión expirada', async () => {
    const onSessionExpired = vi.fn().mockRejectedValue(new Error('raw provider failure'))
    getAal.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })
    challengeAndVerify.mockResolvedValue({
      data: null,
      error: { code: 'session_not_found', message: 'Session not found', status: 403 },
    })

    render(
      <AdminMfaGate onSessionExpired={onSessionExpired}>
        <div>Contenido administrativo</div>
      </AdminMfaGate>,
    )
    fireEvent.change(await screen.findByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verificar y entrar/i }))
    fireEvent.click(await screen.findByRole('button', { name: /cerrar sesión e iniciar nuevamente/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cerrar la sesión. Intenta nuevamente.',
    )
    expect(screen.queryByText('raw provider failure')).not.toBeInTheDocument()
    expect(screen.queryByText('Contenido administrativo')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cerrar sesión e iniciar nuevamente/i })).toBeEnabled()
  })

  it('retira el QR de enrolamiento cuando la sesión expira durante su verificación', async () => {
    getAal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null })
    listFactors.mockResolvedValue({ data: { all: [], totp: [] }, error: null })
    enroll.mockResolvedValue({
      data: { id: 'factor-new', type: 'totp', totp: { qr_code: 'data:image/svg+xml,test', secret: 'hidden', uri: 'hidden' } },
      error: null,
    })
    challengeAndVerify.mockResolvedValue({
      data: null,
      error: { code: 'session_not_found', message: 'Session not found', status: 403 },
    })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)
    fireEvent.click(await screen.findByRole('button', { name: /configurar app autenticadora/i }))
    expect(await screen.findByAltText(/qr para configurar/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verificar y entrar/i }))

    expect(await screen.findByRole('button', { name: /cerrar sesión e iniciar nuevamente/i })).toBeInTheDocument()
    expect(screen.queryByAltText(/qr para configurar/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/código de 6 dígitos/i)).not.toBeInTheDocument()
  })

  it('distingue un fallo de servicio o red de un código TOTP inválido', async () => {
    getAal.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'factor-1' }] },
      error: null,
    })
    challengeAndVerify.mockResolvedValue({
      data: null,
      error: { code: 'unexpected_failure', message: 'Failed to fetch', status: 503 },
    })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)
    fireEvent.change(await screen.findByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verificar y entrar/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos verificar el código. Revisa tu conexión e intenta de nuevo.',
    )
  })

  it('crea el enrolamiento solo tras confirmación explícita y limpia factores abandonados', async () => {
    getAal.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null })
    listFactors.mockResolvedValue({
      data: { all: [{ id: 'stale-1', factor_type: 'totp', status: 'unverified' }], totp: [] },
      error: null,
    })
    unenroll.mockResolvedValue({ data: {}, error: null })
    enroll.mockResolvedValue({
      data: { id: 'factor-new', type: 'totp', totp: { qr_code: 'data:image/svg+xml,test', secret: 'hidden', uri: 'hidden' } },
      error: null,
    })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)
    const setup = await screen.findByRole('button', { name: /configurar app autenticadora/i })
    expect(enroll).not.toHaveBeenCalled()
    fireEvent.click(setup)

    expect(await screen.findByAltText(/qr para configurar/i)).toBeInTheDocument()
    expect(unenroll).toHaveBeenCalledWith({ factorId: 'stale-1' })
    expect(enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'Panel administrativo Cubitat' })
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })

  it('mantiene bloqueado el panel y permite reintentar ante un error seguro', async () => {
    getAal.mockResolvedValue({ data: null, error: { message: 'network error' } })

    render(<AdminMfaGate onSessionExpired={vi.fn()}><div>Contenido administrativo</div></AdminMfaGate>)

    expect(await screen.findByText(/no pudimos comprobar el segundo factor/i)).toBeInTheDocument()
    expect(screen.queryByText('Contenido administrativo')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument()
  })
})
