import { PASSWORD_POLICY_MESSAGE } from './passwordPolicy'

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const candidate = typeof error === 'string'
    ? error
    : error && typeof error === 'object'
      ? [
        (error as { message?: unknown }).message,
        (error as { error_description?: unknown }).error_description,
      ].find((value): value is string => typeof value === 'string' && value !== '{}')
      : undefined
  const message = candidate || fallback
  const normalized = message.toLowerCase()

  if (/unsupported provider|missing oauth secret|provider is not enabled/.test(normalized)) {
    return 'El inicio con Google no está disponible temporalmente. Usa correo y contraseña.'
  }
  if (/captcha|turnstile|security verification/.test(normalized)) {
    return 'Supabase no pudo validar la verificación de seguridad. Completa un nuevo desafío e inténtalo otra vez.'
  }
  if (message.includes('User already registered')) {
    return 'Este correo ya está registrado.'
  }
  if (message.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Por favor, confirma tu correo electronico para continuar.'
  }
  if (normalized.includes('email rate limit exceeded')) {
    return 'Alcanzamos el limite temporal de correos de prueba. Intenta de nuevo mas tarde.'
  }
  if (message.includes('Password should be at least')
    || message.includes('Password should contain')
    || (error && typeof error === 'object' && (error as { name?: unknown }).name === 'AuthWeakPasswordError')) {
    return PASSWORD_POLICY_MESSAGE
  }
  return message
}
