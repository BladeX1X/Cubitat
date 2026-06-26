import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'

type LoginModalProps = {
  onClose?: () => void
}

export function LoginModal({ onClose }: LoginModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <section
      className="login-modal-overlay"
      id="login"
      aria-label="Inicio de sesion"
      role="dialog"
      aria-modal="true"
    >
      <button
        className="login-modal-backdrop"
        type="button"
        aria-label="Cerrar inicio de sesion"
        onClick={onClose}
      />

      <div className="login-modal-shell">
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
            onClick={onClose}
            className="login-close-btn"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>

          <div className="login-modal-heading">
            <span>Bienvenido de vuelta</span>
            <h2>Iniciar sesion</h2>
            <p>
              Entra para publicar, guardar favoritos y administrar tus avisos.
            </p>
          </div>

          <div className="login-social-grid">
            <Button className="login-social-btn" type="button" variant="outline">
              <GoogleIcon />
              Google
            </Button>
            <Button className="login-social-btn" type="button" variant="outline">
              <FacebookIcon />
              Facebook
            </Button>
          </div>

          <div className="login-divider">
            <span>o usa tu correo</span>
          </div>

          <form className="login-form" onSubmit={(event) => event.preventDefault()}>
            <label className="login-input-group">
              <span>Correo electronico</span>
              <Mail className="login-input-icon" size={18} />
              <Input
                className="login-input"
                type="email"
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
              />
            </label>

            <label className="login-input-group">
              <span>Contrasena</span>
              <Lock className="login-input-icon" size={18} />
              <Input
                className="login-input"
                type="password"
                placeholder="********"
                autoComplete="current-password"
              />
              <button
                className="login-password-toggle"
                type="button"
                aria-label="Mostrar u ocultar contrasena"
              >
                <EyeOff size={18} />
              </button>
            </label>

            <div className="login-form-row">
              <label>
                <input type="checkbox" />
                Recordarme
              </label>
              <a href="#recuperar">Olvide mi contrasena</a>
            </div>

            <Button className="login-submit-btn" type="submit" size="lg">
              Iniciar sesion
              <ArrowRight size={18} />
            </Button>
          </form>

          <p className="login-register-copy">
            No tienes cuenta? <a href="#registro">Crear cuenta gratis</a>
          </p>
          <p className="login-legal-copy">
            Al continuar aceptas los <a href="#terminos">terminos</a> y el{' '}
            <a href="#privacidad">aviso de privacidad</a>.
          </p>
        </div>
      </div>
    </section>,
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
