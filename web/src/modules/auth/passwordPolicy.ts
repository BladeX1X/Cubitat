export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un carácter especial.'

const PASSWORD_SYMBOLS = new Set("!@#$%^&*()_+-=[]{};'\\:\"|,.<>/?`~")

export function isStrongPassword(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && Array.from(password).some((character) => PASSWORD_SYMBOLS.has(character))
}

export function getPasswordPolicyError(password: string): string | null {
  return isStrongPassword(password) ? null : PASSWORD_POLICY_MESSAGE
}
