import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import {
  getAdminMfaStatus,
  getAdminMfaBypassUntil,
  MfaVerificationError,
  startTotpEnrollment,
  verifyTotp,
} from './mfaService'

type GateState = 'loading' | 'allowed' | 'setup' | 'challenge' | 'enrolling' | 'error'

type AdminMfaGateProps = {
  children: ReactNode
  onSessionExpired: () => Promise<void> | void
}
function qrSource(value: string) {
  if (value.startsWith('data:')) return value
  return `data:image/svg+xml;utf-8,${encodeURIComponent(value)}`
}

function verificationFailureMessage(error: unknown) {
  if (error instanceof MfaVerificationError) {
    if (error.reason === 'session_expired') {
      return 'Tu sesión expiró. Inicia sesión nuevamente para verificar el segundo factor.'
    }

    if (error.reason === 'invalid_code') {
      return 'El código no es válido o expiró. Usa el código actual e intenta de nuevo.'
    }
  }

  return 'No pudimos verificar el código. Revisa tu conexión e intenta de nuevo.'
}

export function AdminMfaGate({ children, onSessionExpired }: AdminMfaGateProps) {
  const [state, setState] = useState<GateState>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [unverifiedFactorIds, setUnverifiedFactorIds] = useState<string[]>([])
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)
  const [recoveringSession, setRecoveringSession] = useState(false)
  const [bypassUntil, setBypassUntil] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setState('loading')
    setMessage('')
    setSessionExpired(false)
    try {
      const temporaryExpiry = await getAdminMfaBypassUntil()
      if (temporaryExpiry && Date.parse(temporaryExpiry) > Date.now()) {
        setBypassUntil(temporaryExpiry)
        setState('allowed')
        return
      }
      setBypassUntil(null)

      const status = await getAdminMfaStatus()
      setUnverifiedFactorIds(status.unverifiedFactorIds)
      if (status.currentLevel === 'aal2') {
        setState('allowed')
      } else if (status.verifiedFactorId) {
        setFactorId(status.verifiedFactorId)
        setState('challenge')
      } else {
        setState('setup')
      }
    } catch {
      setState('error')
      setMessage('No pudimos comprobar el segundo factor. Intenta de nuevo.')
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (state !== 'allowed' || !bypassUntil) return
    const delay = Date.parse(bypassUntil) - Date.now()
    if (delay <= 0) {
      void loadStatus()
      return
    }
    const timeoutId = window.setTimeout(() => void loadStatus(), delay)
    return () => window.clearTimeout(timeoutId)
  }, [bypassUntil, loadStatus, state])

  const beginEnrollment = async () => {
    setState('loading')
    setMessage('')
    try {
      const enrollment = await startTotpEnrollment(unverifiedFactorIds)
      setFactorId(enrollment.factorId)
      setQrCode(enrollment.qrCode)
      setState('enrolling')
    } catch {
      setState('error')
      setMessage('No pudimos iniciar la configuración del segundo factor.')
    }
  }

  const submitCode = async (event: FormEvent) => {
    event.preventDefault()
    if (!factorId || !/^\d{6}$/.test(code)) {
      setMessage('Escribe el código de 6 dígitos de tu app autenticadora.')
      return
    }

    setMessage('')
    try {
      await verifyTotp(factorId, code)
      setCode('')
      setQrCode(null)
      await loadStatus()
    } catch (error) {
      const hasExpiredSession = (
        error instanceof MfaVerificationError && error.reason === 'session_expired'
      )
      setSessionExpired(hasExpiredSession)
      if (hasExpiredSession) {
        setFactorId(null)
        setQrCode(null)
        setCode('')
      }
      setMessage(verificationFailureMessage(error))
    }
  }

  const recoverExpiredSession = async () => {
    setRecoveringSession(true)
    try {
      await onSessionExpired()
    } catch {
      setMessage('No pudimos cerrar la sesión. Intenta nuevamente.')
    } finally {
      setRecoveringSession(false)
    }
  }

  if (state === 'allowed') {
    return (
      <>
        {bypassUntil && (
          <aside className="mx-auto mt-4 max-w-7xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
            El segundo factor no se exige temporalmente. Se restablecerá automáticamente el{' '}
            {new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(bypassUntil))}.
            Tus factores TOTP siguen configurados.
          </aside>
        )}
        {children}
      </>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-label="Comprobando segundo factor">
        <Loader2 className="h-9 w-9 animate-spin text-[#035f53]" />
      </div>
    )
  }

  return (
    <section className="mx-auto flex min-h-[65vh] max-w-lg items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#035f53]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          {state === 'setup' ? 'Protege el panel administrativo' : 'Verificación administrativa'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {sessionExpired
            ? 'La verificación anterior ya no puede continuar. Cierra la sesión para identificarte nuevamente.'
            : state === 'setup'
            ? 'Configura una app autenticadora para exigir un segundo factor antes de consultar o moderar contenido.'
            : state === 'enrolling'
              ? 'Escanea este QR con tu app autenticadora y escribe el código actual.'
              : 'Escribe el código actual de tu app autenticadora para acceder al panel.'}
        </p>

        {state === 'setup' && (
          <Button className="mt-6 w-full rounded-full bg-[#035f53] text-white hover:bg-[#024a41]" onClick={() => void beginEnrollment()}>
            Configurar app autenticadora
          </Button>
        )}

        {state === 'enrolling' && qrCode && (
          <div className="mt-6 flex justify-center rounded-2xl border border-neutral-200 bg-white p-4">
            <img className="h-56 w-56" src={qrSource(qrCode)} alt="QR para configurar la app autenticadora" />
          </div>
        )}

        {(state === 'challenge' || state === 'enrolling') && !sessionExpired && (
          <form className="mt-6" onSubmit={(event) => void submitCode(event)}>
            <label className="block text-sm font-bold text-neutral-800" htmlFor="admin-totp-code">
              Código de 6 dígitos
            </label>
            <input
              id="admin-totp-code"
              className="mt-2 h-12 w-full rounded-xl border border-neutral-300 px-4 text-center text-xl tracking-[0.35em] outline-none focus:border-[#035f53] focus:ring-2 focus:ring-emerald-100"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
            <Button className="mt-4 w-full rounded-full bg-[#035f53] text-white hover:bg-[#024a41]" type="submit">
              Verificar y entrar
            </Button>
          </form>
        )}

        {message && <p className="mt-4 text-sm font-medium text-red-700" role="alert">{message}</p>}

        {sessionExpired && (
          <Button
            className="mt-5 w-full rounded-full bg-[#035f53] text-white hover:bg-[#024a41]"
            type="button"
            disabled={recoveringSession}
            onClick={() => void recoverExpiredSession()}
          >
            {recoveringSession && <Loader2 className="h-4 w-4 animate-spin" />}
            {recoveringSession ? 'Cerrando sesión...' : 'Cerrar sesión e iniciar nuevamente'}
          </Button>
        )}

        {state === 'error' && (
          <Button className="mt-5 rounded-full" variant="outline" onClick={() => void loadStatus()}>
            Reintentar
          </Button>
        )}
      </div>
    </section>
  )
}
