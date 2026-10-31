import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { supabase } from '../../shared/lib/supabaseClient'
import { cleanAuthUrl, getAuthUrlParams, isPasswordRecoveryFlow } from './authUrlParams'
import { useSEO } from '../../shared/hooks/useSEO'
import { getPasswordPolicyError, PASSWORD_POLICY_MESSAGE } from '../../modules/auth/passwordPolicy'
import {
  getAdminMfaStatus,
  MfaVerificationError,
  verifyTotp,
} from '../../modules/auth/mfa/mfaService'

type ResetPasswordPageProps = {
  onDone: () => void
}

function getRecoveryPreparationErrorMessage(error: unknown) {
  const rawMessage = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : ''
  const normalizedMessage = rawMessage.toLowerCase()

  if (
    normalizedMessage.includes('pkce')
    || normalizedMessage.includes('code verifier')
    || normalizedMessage.includes('expired')
    || normalizedMessage.includes('invalid')
    || normalizedMessage.includes('otp')
    || normalizedMessage.includes('token')
  ) {
    return 'No pudimos validar el enlace de recuperacion. Solicita uno nuevo y abrelo desde el mismo correo.'
  }

  return 'No pudimos validar el enlace de recuperacion. Abre el enlace completo desde el correo o solicita uno nuevo.'
}

export function ResetPasswordPage({ onDone }: ResetPasswordPageProps) {
  useSEO({
    title: 'Restablecer Contraseña',
  })

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isPreparingSession, setIsPreparingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const requiresMfa = Boolean(mfaFactorId)

  useEffect(() => {
    async function prepareSession() {
      const { accessToken, code, error, refreshToken, tokenHash, type } = getAuthUrlParams()
      let unsubscribe: (() => void) | undefined

      if (error) {
        setErrorMsg(getRecoveryPreparationErrorMessage(error))
        cleanAuthUrl('/recuperar-contrasena')
        setIsPreparingSession(false)
        return
      }

      try {
        let sawPasswordRecoveryEvent = false
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            sawPasswordRecoveryEvent = true
          }
        })
        unsubscribe = () => subscription.unsubscribe()

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (verifyError) throw verifyError
          sawPasswordRecoveryEvent = true
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
        }

        const hasAuthCredentials = Boolean(tokenHash || code || (accessToken && refreshToken))
        if (!isPasswordRecoveryFlow(type, sawPasswordRecoveryEvent, hasAuthCredentials)) {
          throw new Error('Abre el enlace completo desde el correo de recuperacion para crear una nueva contrasena.')
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Abre el enlace completo desde el correo de recuperacion para crear una nueva contrasena.')
        }

        const mfaStatus = await getAdminMfaStatus()
        if (mfaStatus.currentLevel !== 'aal2' && mfaStatus.verifiedFactorId) {
          setMfaFactorId(mfaStatus.verifiedFactorId)
        }
        setHasRecoverySession(true)
        cleanAuthUrl('/recuperar-contrasena')
      } catch (err: unknown) {
        cleanAuthUrl('/recuperar-contrasena')
        setErrorMsg(getRecoveryPreparationErrorMessage(err))
      } finally {
        unsubscribe?.()
        setIsPreparingSession(false)
      }
    }

    prepareSession()
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!navigator.onLine) {
      setErrorMsg('Para actualizar tu contraseña necesitas una conexión a Internet activa.')
      return
    }

    if (!hasRecoverySession) {
      setErrorMsg('Primero abre el enlace de recuperacion enviado a tu correo.')
      return
    }

    const passwordPolicyError = getPasswordPolicyError(password)
    if (passwordPolicyError) {
      setErrorMsg(passwordPolicyError)
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contrasenas no coinciden.')
      return
    }

    setLoading(true)
    if (mfaFactorId) {
      if (!/^\d{6}$/.test(mfaCode)) {
        setLoading(false)
        setErrorMsg('Escribe el codigo de 6 digitos de tu app autenticadora.')
        return
      }

      try {
        await verifyTotp(mfaFactorId, mfaCode)
        setMfaFactorId(null)
        setMfaCode('')
      } catch (err) {
        setLoading(false)
        if (err instanceof MfaVerificationError && err.reason === 'invalid_code') {
          setErrorMsg('El codigo no es valido o expiro. Usa el codigo actual e intenta de nuevo.')
          return
        }

        setErrorMsg('No pudimos verificar el segundo factor. Revisa tu conexion e intenta de nuevo.')
        return
      }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setLoading(false)
      const weakPassword = error.message.includes('Password should be at least')
        || error.message.includes('Password should contain')
        || error.name === 'AuthWeakPasswordError'
      const mfaRequired = error.message.includes('AAL2 session is required')
      setErrorMsg(
        weakPassword
          ? PASSWORD_POLICY_MESSAGE
          : mfaRequired
            ? 'Por seguridad, verifica el segundo factor antes de guardar tu nueva contrasena.'
            : (error.message || 'No pudimos actualizar la contrasena.'),
      )
      return
    }

    await supabase.auth.signOut()
    setLoading(false)

    setSuccessMsg('Contrasena actualizada. Ya puedes entrar con tu nueva clave.')
    window.setTimeout(onDone, 1600)
  }

  return (
    <section className="auth-action-page" aria-label="Nueva contrasena">
      <form className="auth-action-card auth-action-form" onSubmit={handleSubmit}>
        <span className="auth-action-icon success">
          {isPreparingSession ? <Loader2 size={30} className="animate-spin" /> : <KeyRound size={32} />}
        </span>

        <p className="eyebrow">Recuperacion de acceso</p>
        <h1>Crea una nueva contrasena</h1>
        <p>
          Escribe una clave segura para recuperar el acceso a tu cuenta Cubitat.
        </p>

        {errorMsg && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 text-xs bg-green-50 border border-green-200 text-green-700 rounded-md">
            {successMsg}
          </div>
        )}
        {requiresMfa && (
          <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md">
            Esta cuenta tiene segundo factor activo. Escribe el codigo de tu app autenticadora para terminar el cambio.
          </div>
        )}

        <label className="login-input-group">
          <span>Nueva contrasena</span>
          <Lock className="login-input-icon" size={18} />
          <Input
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            autoComplete="new-password"
            disabled={isPreparingSession || !hasRecoverySession || Boolean(successMsg)}
          />
          <button
            className="login-password-toggle"
            type="button"
            aria-label="Mostrar u ocultar contrasena"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </label>

        <label className="login-input-group">
          <span>Confirmar contrasena</span>
          <ShieldCheck className="login-input-icon" size={18} />
          <Input
            className="login-input"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="********"
            autoComplete="new-password"
            disabled={isPreparingSession || !hasRecoverySession || Boolean(successMsg)}
          />
          <button
            className="login-password-toggle"
            type="button"
            aria-label="Mostrar u ocultar confirmacion de contrasena"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </label>

        {requiresMfa && (
          <label className="login-input-group">
            <span>Codigo de verificacion</span>
            <ShieldCheck className="login-input-icon" size={18} />
            <Input
              className="login-input text-center tracking-[0.35em]"
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              disabled={isPreparingSession || !hasRecoverySession || Boolean(successMsg)}
            />
          </label>
        )}

        <Button
          className="auth-action-button"
          type="submit"
          disabled={loading || isPreparingSession || !hasRecoverySession || Boolean(successMsg)}
        >
          {loading ? 'Guardando...' : 'Guardar nueva contrasena'}
        </Button>
      </form>
    </section>
  )
}
