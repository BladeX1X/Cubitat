import { describe, expect, it } from 'vitest'
import { PASSWORD_POLICY_MESSAGE, getPasswordPolicyError, isStrongPassword } from './passwordPolicy'

describe('password policy', () => {
  it.each([
    'Segura1!',
    'Clave_9A',
    'Otra+7zZ',
    'Valida=4Q',
  ])('accepts a password that meets the shared policy: %s', (password) => {
    expect(isStrongPassword(password)).toBe(true)
    expect(getPasswordPolicyError(password)).toBeNull()
  })

  it.each([
    'Corta1!',
    'sinmayuscula1!',
    'SINMINUSCULA1!',
    'SinNumero!',
    'SinSimbolo1',
  ])('rejects a password that misses a required class: %s', (password) => {
    expect(isStrongPassword(password)).toBe(false)
    expect(getPasswordPolicyError(password)).toBe(PASSWORD_POLICY_MESSAGE)
  })
})
