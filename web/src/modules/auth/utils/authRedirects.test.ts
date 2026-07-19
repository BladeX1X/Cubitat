import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeAuthReturnPath,
  normalizeAuthReturnPath,
  storeAuthReturnPath,
} from './authRedirects'

describe('auth return paths', () => {
  beforeEach(() => localStorage.clear())

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
})
