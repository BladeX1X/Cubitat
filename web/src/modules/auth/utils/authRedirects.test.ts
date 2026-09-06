import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  consumeAuthReturnPath,
  getAuthRedirectUrl,
  normalizeAuthReturnPath,
  resolveAuthRedirectBaseUrl,
  resolveSupabaseOAuthUrl,
  storeAuthReturnPath,
} from './authRedirects'

describe('auth return paths', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
  })

  it('conserva una ruta interna completa durante un OAuth reciente', () => {
    expect(storeAuthReturnPath('/propiedad/casa-1?from=map#contacto', 1_000)).toBe(true)
    expect(consumeAuthReturnPath(2_000)).toBe('/propiedad/casa-1?from=map#contacto')
    expect(consumeAuthReturnPath(2_000)).toBeNull()
  })

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/auth/callback?code=secret',
    '/recuperar-contrasena',
  ])('rechaza destinos inseguros o reservados: %s', (path) => {
    expect(normalizeAuthReturnPath(path)).toBeNull()
  })

  it('descarta destinos expirados o manipulados', () => {
    expect(storeAuthReturnPath('/favoritos', 1_000)).toBe(true)
    expect(consumeAuthReturnPath(1_000 + 16 * 60 * 1_000)).toBeNull()

    localStorage.setItem('cubitat_auth_redirect_next', 'valor-antiguo')
    expect(consumeAuthReturnPath()).toBeNull()
  })

  it('ignora un VITE_PUBLIC_SITE_URL local cuando la app corre en produccion', () => {
    expect(
      resolveAuthRedirectBaseUrl('http://127.0.0.1:5173', 'https://cubitathome.com'),
    ).toBe('https://cubitathome.com')
  })

  it('usa el origen canonico cuando no hay window disponible', () => {
    expect(resolveAuthRedirectBaseUrl(undefined, undefined)).toBe('https://cubitathome.com')
  })

  it('construye OAuth contra el origen actual cuando la variable publica local se descarta', () => {
    expect(
      `${resolveAuthRedirectBaseUrl(
        'http://127.0.0.1:5173',
        'https://cubitathome.com',
      )}/auth/callback?flow=oauth`,
    ).toBe(
      'https://cubitathome.com/auth/callback?flow=oauth',
    )
  })

  it('conserva redirects locales cuando la app corre localmente', () => {
    expect(
      resolveAuthRedirectBaseUrl('http://127.0.0.1:5173', 'http://127.0.0.1:5173'),
    ).toBe('http://127.0.0.1:5173')
  })

  it('usa getAuthRedirectUrl con el origen del navegador en local', () => {
    vi.stubEnv('VITE_PUBLIC_SITE_URL', '')

    expect(getAuthRedirectUrl('/auth/callback')).toBe('http://localhost:3000/auth/callback')
  })

  it('no reemplaza el proxy OAuth por Supabase local cuando la app corre en produccion', () => {
    const proxiedUrl = 'https://cubitathome.com/api/supabase/auth/v1/authorize?provider=google'

    expect(
      resolveSupabaseOAuthUrl(
        proxiedUrl,
        'http://127.0.0.1:54321',
        'https://cubitathome.com',
      ),
    ).toBe(proxiedUrl)
  })

  it('reemplaza el proxy OAuth por Supabase nativo cuando la configuracion publica es remota', () => {
    expect(
      resolveSupabaseOAuthUrl(
        'https://cubitathome.com/api/supabase/auth/v1/authorize?provider=google',
        'https://tohjzoncoosvjbjcakdl.supabase.co',
        'https://cubitathome.com',
      ),
    ).toBe('https://tohjzoncoosvjbjcakdl.supabase.co/auth/v1/authorize?provider=google')
  })
})
