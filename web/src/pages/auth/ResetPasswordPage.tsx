import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { supabase } from '../../shared/lib/supabaseClient'
import { cleanAuthUrl, getAuthUrlParams } from './authUrlParams'

type ResetPasswordPageProps = {
  onDone: () => void
}

export function ResetPasswordPage({ onDone }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isPreparingSession, setIsPreparingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    async function prepareSession() {
      const { accessToken, code, error, refreshToken } = getAuthUrlParams()

      if (error) {
        setErrorMsg(error)
        cleanAuthUrl('/recuperar-contrasena')
        setIsPreparingSession(false)
        return
      }

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Abre el enlace completo desde el correo de recuperacion para crear una nueva contrasena.')
        }
        setHasRecoverySession(true)
        cleanAuthUrl('/recuperar-contrasena')
      } catch (err: any) {
        cleanAuthUrl('/recuperar-contrasena')
        setErrorMsg(err?.message || 'No pudimos validar el enlace de recuperacion.')
      }

      setIsPreparingSession(false)
    }

    prepareSession()
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!hasRecoverySession) {
      setErrorMsg('Primero abre el enlace de recuperacion enviado a tu correo.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('La contrasena debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contrasenas no coinciden.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setLoading(false)
      setErrorMsg(error.message || 'No pudimos actualizar la contrasena.')
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
