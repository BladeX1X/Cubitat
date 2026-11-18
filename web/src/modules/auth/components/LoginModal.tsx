import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { MODAL_LAYER_STYLE } from '../../../shared/ui/layers'
import { supabase } from '../../../shared/lib/supabaseClient'
import {
  clearAuthReturnPath,
  getAuthRedirectUrl,
  resolveSupabaseOAuthUrl,
  storeAuthReturnPath,
} from '../utils/authRedirects'
import { TurnstileWidget } from '../../../shared/ui/TurnstileWidget'
import { requestPasswordResetWithCaptcha, signUpWithCaptcha } from '../captchaAuth'
import { getPasswordPolicyError } from '../passwordPolicy'
import { getAuthErrorMessage } from '../authErrorMessages'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import { OAuthProviderButtons } from './OAuthProviderButtons'

type LoginModalProps = {
  onClose?: () => void
}

export function LoginModal({ onClose }: LoginModalProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [canResendConfirmation, setCanResendConfirmation] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)

  useEffect(() => {
    setTurnstileToken(null)
  }, [isRegistering, isResettingPassword])

  const turnstileAction = isResettingPassword
    ? 'forgot-password'
    : canResendConfirmation && isRegistering
      ? 'resend-confirmation'
      : isRegistering
        ? 'register-user'
        : 'login-password'

  function resetTurnstileChallenge() {
    setTurnstileToken(null)
    setTurnstileKey((current) => current + 1)
  }

  async function handleGoogleSignIn() {
    if (!navigator.onLine) {
      setErrorMsg('Para iniciar sesión necesitas una conexión a Internet activa.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const currentPath = window.location.pathname + window.location.search + window.location.hash
    if (!storeAuthReturnPath(currentPath)) clearAuthReturnPath()

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl('/auth/callback?flow=oauth'),
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      clearAuthReturnPath()
      setLoading(false)
      const providerUnavailable = /unsupported provider|missing oauth secret|provider is not enabled/i.test(error.message || '')
      setErrorMsg(
        providerUnavailable
          ? 'El inicio con Google no está disponible temporalmente. Usa correo y contraseña.'
          : error.message || 'No pudimos iniciar sesion con Google.',
      )
      return
    }

    if (data?.url) {
      const nativeUrl = resolveSupabaseOAuthUrl(
        data.url,
        import.meta.env.VITE_SUPABASE_URL,
        window.location.origin,
      )
      window.location.assign(nativeUrl)
    } else {
      clearAuthReturnPath()
      setLoading(false)
      setErrorMsg('No se pudo generar la URL de autenticación.')
    }
  }

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      onClose?.()
    }, 400) // Match animation duration
  }, [onClose])

  useEffect(() => {
    // Lock scrolling on parent body
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setCanResendConfirmation(false)

    if (!navigator.onLine) {
      setErrorMsg('Para iniciar sesión necesitas una conexión a Internet activa.')
      return
    }

    const cleanEmail = email.trim().toLowerCase()

    if (isResettingPassword) {
      if (!turnstileToken) {
        setErrorMsg('Por favor, completa la verificación de seguridad.')
        return
      }
      setLoading(true)
      try {
        const { error } = await requestPasswordResetWithCaptcha({
          email: cleanEmail,
          captchaToken: turnstileToken,
          redirectTo: getAuthRedirectUrl('/recuperar-contrasena'),
        })
        if (error) throw error
        setSuccessMsg('Si el correo esta registrado, recibiras un enlace para crear una nueva contrasena.')
        setTurnstileToken(null)
      } catch (err: unknown) {
        resetTurnstileChallenge()
        setErrorMsg(getAuthErrorMessage(err, 'No pudimos enviar el correo de recuperacion.'))
      } finally {
        setLoading(false)
      }
      return
    }

    // Password validation rules
    if (isRegistering) {
      const passwordPolicyError = getPasswordPolicyError(password)
      if (passwordPolicyError) {
        setErrorMsg(passwordPolicyError)
        return
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.')
        return
      }
    }

    if (!turnstileToken) {
      setErrorMsg('Por favor, completa la verificación de seguridad.')
      return
    }

    if (isRegistering) {
      setLoading(true)
    } else {
      setLoading(true)
    }

    try {
      if (isRegistering) {
        // Sign Up with custom metadata trigger values
        const { data, error } = await signUpWithCaptcha({
          email: cleanEmail,
          password,
          fullName,
          captchaToken: turnstileToken!,
          emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
        })
        if (error) throw error

        const existingAccount = data.user?.identities?.length === 0
        setSuccessMsg(existingAccount
          ? 'Ese correo ya tiene una cuenta. Si ya confirmaste el correo, inicia sesion. Si aun no lo confirmaste, puedes reenviar el enlace.'
          : 'Cuenta creada. Revisa tu correo para confirmar el email antes de iniciar sesion.'
        )
        setCanResendConfirmation(true)
        setConfirmPassword('')
        setTurnstileToken(null)
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
          options: {
            captchaToken: turnstileToken,
          },
        })
        if (error) throw error
        setTurnstileToken(null)
        onClose?.()
      }
    } catch (err: unknown) {
      logSafeEvent({
        module: 'auth',
        action: isResettingPassword ? 'reset_password' : isRegistering ? 'register' : 'login',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      resetTurnstileChallenge()
      setErrorMsg(getAuthErrorMessage(err, 'Ocurrió un error inesperado.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setErrorMsg('Escribe el correo para reenviar la confirmacion.')
      return
    }
    if (!turnstileToken) {
      setErrorMsg('Por favor, completa la verificación de seguridad.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          turnstileToken,
        }),
      })

      if (!response.ok) {
        let message = 'No pudimos procesar la solicitud.'
        try {
          const payload = await response.json() as { message?: unknown }
          if (typeof payload.message === 'string' && payload.message.trim()) {
            message = payload.message
          }
        } catch {
          // Keep the safe generic message when the response is not JSON.
        }
        throw new Error(message)
      }
      setSuccessMsg('Si la solicitud puede procesarse, recibiras un correo con los pasos para continuar.')
      setCanResendConfirmation(false)
    } catch (err: unknown) {
      logSafeEvent({
        module: 'auth',
        action: 'resend_confirmation',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setErrorMsg(getAuthErrorMessage(err, 'No pudimos reenviar el correo de confirmacion.'))
    } finally {
      resetTurnstileChallenge()
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className={`login-modal-overlay ${isClosing ? 'closing' : ''}`}
      style={MODAL_LAYER_STYLE}
      id="login"
      aria-label="Inicio de sesion"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="login-modal-backdrop"
        type="button"
        aria-label="Cerrar inicio de sesion"
        onClick={handleClose}
      />

      <div className="login-modal-shell animate-in zoom-in-95 fade-in duration-300 ease-out">
        <aside className="login-modal-aside" aria-hidden="true">
          <div className="login-modal-brand">
            <img
              className="login-modal-logo"
              src="/brand/tugao/logo-horizontal.png"
              alt=""
              width={1160}
              height={330}
            />
          </div>
          <div className="login-modal-copy">
            <span>Cuenta Cubitat</span>
            <h2>Gestiona tus propiedades desde un solo lugar.</h2>
            <p>
              Publica anuncios, guarda busquedas y recibe contactos de
              compradores o arrendatarios interesados.
            </p>
          </div>
          <div className="login-trust-list">
            <span>
              <ShieldCheck size={18} />
              Verificacion de usuario
            </span>
            <span>
              <UserRound size={18} />
              Perfil para vendedores y agentes
            </span>
          </div>
        </aside>

        <div className="login-modal-card">
          <button
            type="button"
            onClick={handleClose}
            className="login-close-btn"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          <div className="login-modal-heading">
            <span>Bienvenido de vuelta</span>
            <h2>{isResettingPassword ? 'Recuperar contrasena' : isRegistering ? 'Crear cuenta' : 'Iniciar sesion'}</h2>
            <p>
              {isRegistering 
                ? 'Registrate para publicar propiedades y contactar dueños.' 
                : 'Entra para publicar, guardar favoritos y administrar tus avisos.'}
            </p>
          </div>

          <OAuthProviderButtons
            disabled={loading || isResettingPassword}
            onGoogleSignIn={handleGoogleSignIn}
          />

          <div className="login-divider">
            <span>o usa tu correo</span>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-md">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-xs bg-green-50 border border-green-200 text-green-700 rounded-md">
                {successMsg}
                {canResendConfirmation && isRegistering && !isResettingPassword ? (
                  <button
                    className="mt-2 block font-bold text-[#035f53] underline underline-offset-2"
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={loading}
                  >
                    Reenviar enlace si falta confirmar
                  </button>
                ) : null}
              </div>
            )}

            {isRegistering && !isResettingPassword && (
              <label className="login-input-group">
                <span>Nombre completo</span>
                <UserRound className="login-input-icon" size={18} />
                <Input
                  className="login-input"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Perez"
                />
              </label>
            )}

            <label className="login-input-group">
              <span>Correo electronico</span>
              <Mail className="login-input-icon" size={18} />
              <Input
                className="login-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
              />
            </label>

            {!isResettingPassword && (
              <label className="login-input-group">
                <span>Contrasena</span>
                <Lock className="login-input-icon" size={18} />
                <Input
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
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
            )}

            {isRegistering && !isResettingPassword && (
              <label className="login-input-group">
                <span>Confirmar contrasena</span>
                <Lock className="login-input-icon" size={18} />
                <Input
                  className="login-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="new-password"
                />
                <button
                  className="login-password-toggle"
                  type="button"
                  aria-label="Mostrar u ocultar contrasena de confirmacion"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </label>
            )}

            {!isRegistering && !isResettingPassword && (
              <div className="login-form-row">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" />
                  Recordarme
                </label>
                <button
                  type="button"
                  className="login-link-button"
                  onClick={() => {
                    setIsResettingPassword(true)
                    setErrorMsg(null)
                    setSuccessMsg(null)
                  }}
                >
                  Olvide mi contrasena
                </button>
              </div>
            )}

            <TurnstileWidget
              key={turnstileKey}
              action={turnstileAction}
              onVerify={(token) => {
                setTurnstileToken(token)
                setErrorMsg((current) => current && /captcha|turnstile|verificación de seguridad/i.test(current)
                  ? null
                  : current)
              }}
              onExpire={() => setTurnstileToken(null)}
              onError={() => {
                setTurnstileToken(null)
                setErrorMsg('No se pudo cargar la verificación de seguridad. Revisa tu conexión y vuelve a intentarlo.')
              }}
            />

            <Button className="login-submit-btn" type="submit" size="lg" disabled={loading}>
              {loading ? (
                <>Procesando...</>
              ) : (
                <>
                  {isResettingPassword ? 'Enviar enlace' : isRegistering ? 'Crear cuenta' : 'Iniciar sesion'}
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </form>

          {isResettingPassword && (
            <p className="login-register-copy">
              ¿Recordaste tu contrasena?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsResettingPassword(false)
                  setIsRegistering(false)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="text-[#035f53] font-semibold hover:underline"
              >
                Iniciar sesion
              </button>
            </p>
          )}

          {!isResettingPassword && (
          <p className="login-register-copy">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'} {' '}
            <button 
              type="button" 
              onClick={() => {
                setIsRegistering(!isRegistering)
                setErrorMsg(null)
                setSuccessMsg(null)
                setCanResendConfirmation(false)
              }}
              className="text-[#035f53] font-semibold hover:underline"
            >
              {isRegistering ? 'Iniciar sesión' : 'Crear cuenta gratis'}
            </button>
          </p>
          )}
          <p className="login-legal-copy">
            Al continuar aceptas los <a href="/terminos">terminos</a> y el{' '}
            <a href="/privacidad">aviso de privacidad</a>.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
