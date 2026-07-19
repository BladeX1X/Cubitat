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
import { clearAuthReturnPath, getAuthRedirectUrl, storeAuthReturnPath } from '../utils/authRedirects'
import { TurnstileWidget } from '../../../shared/ui/TurnstileWidget'
import { verifyTurnstile } from '../../../shared/lib/turnstile'

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

  useEffect(() => {
    setTurnstileToken(null)
  }, [isRegistering, isResettingPassword])

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
      setErrorMsg(error.message || 'No pudimos iniciar sesion con Google.')
      return
    }

    if (data?.url) {
      // Reemplazar la URL del proxy por la URL nativa de Supabase para evitar interceptaciones del Service Worker PWA
      const nativeUrl = data.url.replace(
        window.location.origin + '/api/supabase',
        import.meta.env.VITE_SUPABASE_URL
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
      const isTest = (import.meta as any).env?.MODE === 'test'
      if (!isTest) {
        if (!turnstileToken) {
          setErrorMsg('Por favor, completa la verificación de seguridad.')
          return
        }
        setLoading(true)
        const isHuman = await verifyTurnstile(turnstileToken)
        if (!isHuman) {
          setErrorMsg('La verificación de seguridad falló. Por favor intenta de nuevo.')
          setLoading(false)
          return
        }
      }
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: getAuthRedirectUrl('/recuperar-contrasena'),
        })
        if (error) throw error
        setSuccessMsg('Si el correo esta registrado, recibiras un enlace para crear una nueva contrasena.')
        setTurnstileToken(null)
      } catch (err: any) {
        setErrorMsg(err?.message || 'No pudimos enviar el correo de recuperacion.')
      } finally {
        setLoading(false)
      }
      return
    }

    // Password validation rules
    if (isRegistering) {
      const hasUppercase = /[A-Z]/.test(password)
      const hasLowercase = /[a-z]/.test(password)
      const hasNumber = /[0-9]/.test(password)
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

      if (password.length < 8 || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        setErrorMsg('La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un carácter especial.')
        return
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.')
        return
      }
    }

    const isTest = (import.meta as any).env?.MODE === 'test'
    if (isRegistering && !isTest) {
      if (!turnstileToken) {
        setErrorMsg('Por favor, completa la verificación de seguridad.')
        return
      }
      setLoading(true)
      const isHuman = await verifyTurnstile(turnstileToken)
      if (!isHuman) {
        setErrorMsg('La verificación de seguridad falló. Por favor intenta de nuevo.')
        setLoading(false)
        return
      }
    } else {
      setLoading(true)
    }

    try {
      if (isRegistering) {
        // Sign Up with custom metadata trigger values
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl('/auth/callback'),
            data: {
              full_name: fullName,
              role: 'buyer', // Default public profile role
            }
          }
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
          password
        })
        if (error) throw error
        onClose?.()
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      let msg = 'Ocurrió un error inesperado.'
      if (err?.message && err.message !== '{}') {
        msg = err.message
      } else if (typeof err === 'string' && err !== '{}') {
        msg = err
      } else if (err?.error_description) {
        msg = err.error_description
      }
      
      // Translate common Supabase auth errors
      if (msg.includes('User already registered')) {
        msg = 'Este correo ya está registrado.'
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'Correo o contraseña incorrectos.'
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Por favor, confirma tu correo electronico para continuar.'
      } else if (msg.toLowerCase().includes('email rate limit exceeded')) {
        msg = 'Alcanzamos el limite temporal de correos de prueba. Intenta de nuevo mas tarde.'
      } else if (msg.includes('Password should be at least')) {
        msg = 'La contraseña es demasiado débil.'
      }

      setErrorMsg(msg)
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
        }),
      })

      if (!response.ok) throw new Error('No pudimos procesar la solicitud.')
      setSuccessMsg('Si falta confirmar el correo, recibiras un nuevo enlace. Si ya esta confirmado, recibiras un aviso con las opciones para entrar.')
      setCanResendConfirmation(false)
    } catch (err: any) {
      console.error('Resend confirmation error:', err)
      setErrorMsg(err?.message || 'No pudimos reenviar el correo de confirmacion.')
    } finally {
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
            <span className="brand-mark">c</span>
            <strong>Cubitat</strong>
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

          <div className="login-social-grid">
            <Button
              className="login-social-btn"
              type="button"
              variant="outline"
              disabled={loading || isResettingPassword}
              onClick={handleGoogleSignIn}
            >
              <GoogleIcon />
              Google
            </Button>
            <Button className="login-social-btn" type="button" variant="outline" disabled>
              <FacebookIcon />
              Facebook
            </Button>
          </div>

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

            {(isRegistering || isResettingPassword) && (
              <TurnstileWidget
                action={isResettingPassword ? "forgot-password" : "register-user"}
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            )}

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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M24 12.07C24 5.45 18.63.07 12 .07S0 5.45 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07z"
        fill="#1877F2"
      />
    </svg>
  )
}
