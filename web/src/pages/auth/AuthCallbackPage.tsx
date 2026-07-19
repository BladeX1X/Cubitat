import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, MailCheck, TriangleAlert } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { supabase } from '../../shared/lib/supabaseClient'
import { cleanAuthUrl, getAuthUrlParams } from './authUrlParams'
import { useSEO } from '../../shared/hooks/useSEO'
import { consumeAuthReturnPath } from '../../modules/auth/utils/authRedirects'

type AuthCallbackPageProps = {
  onContinue: (targetPath?: string) => void
}

type CallbackStatus = 'loading' | 'success' | 'error'

export function AuthCallbackPage({ onContinue }: AuthCallbackPageProps) {
  useSEO({
    title: 'Verificando Acceso',
  })

  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [message, setMessage] = useState('Estamos verificando tu enlace de acceso.')
  const onContinueRef = useRef(onContinue)

  useEffect(() => {
    onContinueRef.current = onContinue
  }, [onContinue])

  useEffect(() => {
    async function handleCallback() {
      const { code, error, isOAuthCallback } = getAuthUrlParams()

      if (error) {
        setStatus('error')
        setMessage(error)
        cleanAuthUrl('/auth/callback')
        return
      }

      try {
        let provider = 'email'
        let providers: string[] = []
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          provider = data?.user?.app_metadata?.provider || 'email'
          providers = data?.user?.app_metadata?.providers || []
        } else {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            throw new Error('No encontramos una sesion de verificacion activa. Abre el enlace completo desde tu correo.')
          }
          provider = session.user?.app_metadata?.provider || 'email'
          providers = session.user?.app_metadata?.providers || []
        }

        const isOAuth = isOAuthCallback || provider !== 'email'
          || (providers.length > 0 && (providers.length > 1 || !providers.includes('email')))

        if (isOAuth) {
          const next = consumeAuthReturnPath()
          if (next) {
            window.history.replaceState(null, '', next)
            onContinueRef.current(next)
            return
          }

          window.history.replaceState(null, '', '/')
          onContinueRef.current()
          return
        }

        cleanAuthUrl('/auth/callback')
        setStatus('success')
        setMessage('Tu correo fue verificado correctamente. Ya puedes continuar en Cubitat.')
      } catch (err: any) {
        cleanAuthUrl('/auth/callback')
        setStatus('error')
        setMessage(err?.message || 'No pudimos validar este enlace. Solicita uno nuevo.')
      }
    }

    handleCallback()
  }, [])

  return (
    <section className="auth-action-page" aria-label="Confirmacion de correo">
      <div className="auth-action-card">
        <span className={`auth-action-icon ${status}`}>
          {status === 'loading' && <Loader2 size={30} className="animate-spin" />}
          {status === 'success' && <MailCheck size={32} />}
          {status === 'error' && <TriangleAlert size={32} />}
        </span>

        <p className="eyebrow">Cuenta Cubitat</p>
        <h1>
          {status === 'loading' && 'Verificando enlace'}
          {status === 'success' && 'Correo confirmado'}
          {status === 'error' && 'Enlace no valido'}
        </h1>
        <p>{message}</p>

        <Button
          className="auth-action-button"
          type="button"
          onClick={() => onContinueRef.current()}
          disabled={status === 'loading'}
        >
          {status === 'success' ? <CheckCircle2 size={18} /> : null}
          Ir al inicio
        </Button>
      </div>
    </section>
  )
}
