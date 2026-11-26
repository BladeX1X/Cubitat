import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, MailCheck, TriangleAlert } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { supabase } from '../../shared/lib/supabaseClient'
import { cleanAuthUrl, getAuthUrlParams } from './authUrlParams'
import { useSEO } from '../../shared/hooks/useSEO'
import { consumeAuthReturnPath } from '../../modules/auth/utils/authRedirects'
import { clearSignupReferralCode, getSignupReferralCode } from '../../modules/referrals/utils/tracker'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

type AuthCallbackPageProps = {
  onContinue: (targetPath?: string) => void
}

type CallbackStatus = 'loading' | 'success' | 'error'

function getEmailConfirmationErrorMessage(message?: string) {
  if (!message) return 'No pudimos validar este enlace. Solicita uno nuevo.'

  const normalizedMessage = message.toLowerCase()
  if (
    normalizedMessage.includes('pkce')
    || normalizedMessage.includes('code verifier')
    || normalizedMessage.includes('email link')
    || normalizedMessage.includes('expired')
    || normalizedMessage.includes('invalid')
    || normalizedMessage.includes('otp')
    || normalizedMessage.includes('token')
  ) {
    return 'No pudimos confirmar este enlace. Solicita uno nuevo o vuelve a iniciar el registro.'
  }

  return message
}

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
      const { accessToken, code, error, isOAuthCallback, refreshToken, tokenHash, type } = getAuthUrlParams()

      if (error) {
        setStatus('error')
        setMessage(error)
        cleanAuthUrl('/auth/callback')
        return
      }

      try {
        let provider = 'email'
        let providers: string[] = []
        if (tokenHash && type === 'signup') {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup',
          })
          if (verifyError) throw verifyError
          provider = data?.user?.app_metadata?.provider || 'email'
          providers = data?.user?.app_metadata?.providers || []
        } else if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          provider = data?.user?.app_metadata?.provider || 'email'
          providers = data?.user?.app_metadata?.providers || []
        } else if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) throw sessionError
          if (!data.session) {
            throw new Error('No pudimos crear la sesion de verificacion. Solicita un enlace nuevo.')
          }
          provider = data.session.user?.app_metadata?.provider || 'email'
          providers = data.session.user?.app_metadata?.providers || []
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
          const isGoogleOAuth = provider === 'google' || providers.includes('google')
          const referralCode = isGoogleOAuth ? getSignupReferralCode() : null
          if (referralCode) {
            try {
              const { error: attributionError } = await supabase.rpc('attribute_own_oauth_agent_signup', {
                p_referral_code: referralCode,
              })
              if (attributionError) throw attributionError
              clearSignupReferralCode()
            } catch (attributionError) {
              // Account creation and sign-in must succeed even if the optional attribution RPC is unavailable.
              logSafeEvent({
                module: 'referrals',
                action: 'oauth_signup_attribution',
                level: 'warn',
                code: sanitizeErrorReason(attributionError),
              })
            }
          }

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
      } catch (err: unknown) {
        cleanAuthUrl('/auth/callback')
        setStatus('error')
        setMessage(getEmailConfirmationErrorMessage(err instanceof Error ? err.message : undefined))
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
